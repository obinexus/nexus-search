import { CacheManager, IndexedDocument, SearchStorage } from "@/storage";
import {
    SearchOptions,
    SearchResult,
    SearchEngineConfig,
    SearchEventListener,
    SearchEvent,
    IndexNode,
    DocumentMetadata,
    IndexableDocumentFields,
    IndexedDocument
} from "@/types";
import { validateSearchOptions, createSearchableFields, bfsRegexTraversal, dfsRegexTraversal } from "@/utils";
import { IndexManager } from "../storage/IndexManager";
import { QueryProcessor } from "./QueryProcessor";
import { TrieSearch } from "@/algorithms/trie";

export class SearchEngine {
    private readonly queryProcessor: QueryProcessor;
    private storage: SearchStorage;
    private readonly cache: CacheManager;
    private readonly config: SearchEngineConfig;
    private readonly eventListeners: Set<SearchEventListener>;
    private trie: TrieSearch;
    private isInitialized: boolean = false;
    private documents: Map<string, IndexedDocument>;
    private trieRoot: IndexNode;
    private readonly documentSupport: boolean;
    private readonly indexManager: IndexManager;

    constructor(config: SearchEngineConfig) {
        this.config = config;
        this.indexManager = new IndexManager(config);
        this.queryProcessor = new QueryProcessor();
        this.storage = new SearchStorage(config.storage);
        this.cache = new CacheManager();
        this.eventListeners = new Set();
        this.trie = new TrieSearch();
        this.documents = new Map();
        this.trieRoot = { id: '', value: '', score: 0, children: new Map() };
        this.documentSupport = config.documentSupport?.enabled ?? false;
    
        this.config = config;
        this.indexManager = new IndexManager(config);
        this.queryProcessor = new QueryProcessor();
        this.storage = new SearchStorage(config.storage);
        this.cache = new CacheManager();
        this.eventListeners = new Set();
        this.trie = new TrieSearch();
        this.documents = new Map();
        this.trieRoot = { id: '', value: '', score: 0, children: new Map() };
    } 
   

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            try {
                await this.storage.initialize();
            } catch (storageError) {
                this.emitEvent({
                    type: 'storage:error',
                    timestamp: Date.now(),
                    error: storageError instanceof Error ? storageError : new Error(String(storageError))
                });

                this.storage = new SearchStorage({ type: 'memory' });
                await this.storage.initialize();
            }

            await this.loadIndexes();
            this.isInitialized = true;

            this.emitEvent({
                type: 'engine:initialized',
                timestamp: Date.now()
            });
        } catch (error) {
            throw new Error(`Failed to initialize search engine: ${String(error)}`);
        }
    }


    public async search(
        query: string,
        options: SearchOptions = {}
    ): Promise<SearchResult<IndexedDocument>[]> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        validateSearchOptions(options);

        const searchStartTime = Date.now();
        this.emitEvent({
            type: 'search:start',
            timestamp: searchStartTime,
            data: { query, options }
        });

        const cacheKey = this.generateCacheKey(query, options);
        const cachedResults = this.cache.get(cacheKey);
        if (cachedResults) {
            return cachedResults as SearchResult<IndexedDocument>[];
        }

        try {
            let results: Array<{ id: string; score: number }>;

            if (options.regex) {
                const regex = typeof options.regex === 'string' ?
                    new RegExp(options.regex) : options.regex;

                if (this.isComplexRegex(regex)) {
                    results = dfsRegexTraversal(
                        this.trieRoot,
                        regex,
                        options.maxResults || 10
                    );
                } else {
                    results = bfsRegexTraversal(
                        this.trieRoot,
                        regex,
                        options.maxResults || 10
                    );
                }
            } else {
                const processedQuery = this.queryProcessor.process(query);
                const searchTerms = processedQuery.toLowerCase().split(/\s+/).filter(Boolean);
                results = await this.performBasicSearch(searchTerms, options);
            }

            const searchResults = await this.processSearchResults(results, options);
            this.cache.set(cacheKey, searchResults);

            this.emitEvent({
                type: 'search:complete',
                timestamp: Date.now(),
                data: {
                    query,
                    options,
                    resultCount: searchResults.length,
                    searchTime: Date.now() - searchStartTime
                }
            });

            return searchResults;
        } catch (error) {
            this.emitEvent({
                type: 'search:error',
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw new Error(`Search failed: ${error}`);
        }
    }

    public async addDocuments(documents: IndexedDocument[]): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // Normalize documents if document support is enabled
            const normalizedDocs = documents.map(doc => this.normalizeDocument(doc));
            
            // Validate documents if validation is enabled
            if (this.documentSupport && this.config.documentSupport?.validation) {
                this.validateDocuments(normalizedDocs);
            }

            // Proceed with standard document addition
            for (const doc of normalizedDocs) {
                this.documents.set(doc.id, doc);
                this.trie.addData(doc.id, doc.fields.content);
                await this.indexManager.addDocument(doc);
            }
        } catch (error) {
            this.emitEvent({
                type: 'index:error',
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw error;
        }
    }

    private validateDocuments(documents: IndexedDocument[]): void {
        if (!this.config.documentSupport?.validation) return;

        const { required = [], customValidators = {} } = this.config.documentSupport.validation;

        for (const doc of documents) {
            // Check required fields
            for (const field of required) {
                if (!doc.fields[field]) {
                    throw new Error(`Field '${field}' is required for document ${doc.id}`);
                }
            }

            // Run custom validators
            Object.entries(customValidators).forEach(([field, validator]) => {
                const value = doc.fields[field];
                if (value !== undefined && !validator(value)) {
                    throw new Error(`Validation failed for field '${field}' in document ${doc.id}`);
                }
            });
        }
    }

    public async updateDocument(document: IndexedDocument): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const normalizedDoc = this.normalizeDocument(document);

        if (this.documentSupport && this.config.documentSupport?.versioning?.enabled) {
            await this.handleVersioning(normalizedDoc);
        }

        await super.updateDocument(normalizedDoc);
    }

    public async removeDocument(documentId: string): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.documents.has(documentId)) {
            throw new Error(`Document ${documentId} not found`);
        }

        try {
            this.documents.delete(documentId);
            this.trie.removeData(documentId);
            await this.indexManager.removeDocument(documentId);
            this.cache.clear();

            try {
                await this.storage.storeIndex(this.config.name, this.indexManager.exportIndex());
            } catch (storageError) {
                this.emitEvent({
                    type: 'storage:error',
                    timestamp: Date.now(),
                    error: storageError instanceof Error ? storageError : new Error(String(storageError))
                });
            }

            this.emitEvent({
                type: 'remove:complete',
                timestamp: Date.now(),
                data: { documentId }
            });
        } catch (error) {
            this.emitEvent({
                type: 'remove:error',
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw new Error(`Failed to remove document: ${error}`);
        }
    }

    public async clearIndex(): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            await this.storage.clearIndices();
            this.documents.clear();
            this.trie = new TrieSearch();
            this.indexManager.clear();
            this.cache.clear();

            this.emitEvent({
                type: 'index:clear',
                timestamp: Date.now()
            });
        } catch (error) {
            this.emitEvent({
                type: 'index:clear:error',
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw new Error(`Failed to clear index: ${error}`);
        }
    }

    private async performBasicSearch(
        searchTerms: string[],
        options: SearchOptions
    ): Promise<Array<{ id: string; score: number }>> {
        const results = new Map<string, { score: number; matches: Set<string> }>();

        for (const term of searchTerms) {
            const matches = options.fuzzy ?
                this.trie.fuzzySearch(term) :
                this.trie.search(term);

            for (const docId of matches) {
                const current = results.get(docId) || { score: 0, matches: new Set<string>() };
                current.score += this.calculateTermScore(term, docId, options);
                current.matches.add(term);
                results.set(docId, current);
            }
        }

        return Array.from(results.entries())
            .map(([id, { score }]) => ({ id, score }))
            .sort((a, b) => b.score - a.score);
    }

    private async processSearchResults(
        results: Array<{ id: string; score: number }>,
        options: SearchOptions
    ): Promise<SearchResult<IndexedDocument>[]> {
        const processedResults: SearchResult<IndexedDocument>[] = [];

        for (const { id, score } of results) {
            const doc = this.documents.get(id);
            if (!doc) continue;

            const searchResult: SearchResult<IndexedDocument> = {
                id,
                item: doc,

                score: this.normalizeScore(score),
                matches: [],
                metadata: {
                    ...doc.metadata,
                    lastAccessed: Date.now()
                },
                document: doc
            };

            if (options.includeMatches) {
                searchResult.matches = this.extractMatches(doc, options);
            }

            processedResults.push(searchResult);
        }

        return this.applyPagination(processedResults, options);
    }

    private calculateTermScore(term: string, docId: string, options: SearchOptions): number {
        const doc = this.documents.get(docId);
        if (!doc) return 0;

        const searchFields = options.fields || this.config.fields;
        let score = 0;

        for (const field of searchFields) {
            const fieldContent = String(doc.fields[field] || '').toLowerCase();
            const fieldBoost = (options.boost?.[field] || 1);
            const termFrequency = (fieldContent.match(new RegExp(term, 'gi')) || []).length;
            score += termFrequency * fieldBoost;
        }

        return score;
    }

    private normalizeScore(score: number): number {
        return Math.min(Math.max(score / 100, 0), 1);
    }

    private extractMatches(doc: IndexedDocument, options: SearchOptions): string[] {
        const matches = new Set<string>();
        const searchFields = options.fields || this.config.fields;

        for (const field of searchFields) {
            const fieldContent = String(doc.fields[field] || '').toLowerCase();

            if (options.regex) {
                const regex = typeof options.regex === 'string' ?
                    new RegExp(options.regex, 'gi') :
                    new RegExp(options.regex.source, 'gi');

                const fieldMatches = fieldContent.match(regex) || [];
                fieldMatches.forEach(match => matches.add(match));
            }
        }

        return Array.from(matches);
    }

    private applyPagination(
        results: SearchResult<IndexedDocument>[],
        options: SearchOptions
    ): SearchResult<IndexedDocument>[] {
        const page = options.page || 1;
        const pageSize = options.pageSize || 10;
        const start = (page - 1) * pageSize;
        return results.slice(start, start + pageSize);
    }

    private isComplexRegex(regex: RegExp): boolean {
        const pattern = regex.source;
        return (
            pattern.includes('{') ||
            pattern.includes('+') ||
            pattern.includes('*') ||
            pattern.includes('?') ||
            pattern.includes('|') ||
            pattern.includes('(?') ||
            pattern.includes('[')
        );
    }

    private async loadIndexes(): Promise<void> {
        try {
            const storedIndex = await this.storage.getIndex(this.config.name);
            if (storedIndex) {
                this.indexManager.importIndex(storedIndex);
                const indexedDocs = this.indexManager.getAllDocuments();
                for (const doc of indexedDocs) {
                    this.documents.set(doc[1].id, IndexedDocument.fromObject(doc[1]));
                }
            }
        } catch (error) {
            console.warn('Failed to load stored index, starting fresh:', error);
        }
    }

    private generateCacheKey(query: string, options: SearchOptions): string {
        return `${this.config.name}-${query}-${JSON.stringify(options)}`;
    }

    private generateDocumentId(): string {
        return `${this.config.name}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }

    public addEventListener(listener: SearchEventListener): void {
        this.eventListeners.add(listener);
    }

    public removeEventListener(listener: SearchEventListener): void {
        this.eventListeners.delete(listener);
    }

    private emitEvent(event: SearchEvent): void {
        this.eventListeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('Error in event listener:', error);
            }
        });
    }

    public async close(): Promise<void> {
        try {
            await this.storage.close();
            this.cache.clear();
            this.documents.clear();
            this.isInitialized = false;

            this.emitEvent({
                type: 'engine:closed',
                timestamp: Date.now()
            });
        } catch (error) {
            console.warn('Error during close:', error);
        }
    }

    public getIndexedDocumentCount(): number {
        return this.documents.size;
    }

    public getTrieState(): unknown {
        return this.trie.exportState();
    }

    public async bulkUpdate(updates: Map<string, Partial<IndexedDocument>>): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const updatePromises: Promise<void>[] = [];

        for (const [id, update] of updates) {
            const existingDoc = this.documents.get(id);
            if (existingDoc) {
                const updatedDoc = new IndexedDocument(
                    id,
                    { ...existingDoc.fields, ...update.fields },
                    { ...existingDoc.metadata, ...update.metadata }
                );
                updatePromises.push(this.updateDocument(updatedDoc));
            }
        }

        try {
            await Promise.all(updatePromises);
            this.emitEvent({
                type: 'bulk:update:complete',
                timestamp: Date.now(),
                data: { updateCount: updates.size }
            });
        } catch (error) {
            this.emitEvent({
                type: 'bulk:update:error',
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw new Error(`Bulk update failed: ${error}`);
        }
    }

    public async importIndex(indexData: unknown): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            await this.clearIndex();
            this.indexManager.importIndex(indexData);

            const indexedDocuments = Array.from(this.documents.values()).map(doc => IndexedDocument.fromObject(doc));

            await this.addDocuments(indexedDocuments);

            this.emitEvent({
                type: 'import:complete',
                timestamp: Date.now(),
                data: { documentCount: this.documents.size }
            });
        } catch (error) {
            this.emitEvent({
                type: 'import:error',
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw new Error(`Import failed: ${error}`);
        }
    }

    public exportIndex(): unknown {
        if (!this.isInitialized) {
            throw new Error('Search engine not initialized');
        }
        return this.indexManager.exportIndex();
    }

    public getDocument(id: string): IndexedDocument | undefined {
        return this.documents.get(id);
    }

    public getAllDocuments(): IndexedDocument[] {
        return Array.from(this.documents.values());
    }

    public async reindexAll(): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const documents = this.getAllDocuments();
            await this.clearIndex();
            await this.addDocuments(documents);

            this.emitEvent({
                type: 'reindex:complete',
                timestamp: Date.now(),
                data: { documentCount: documents.length }
            });
        } catch (error) {
            this.emitEvent({
                type: 'reindex:error',
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw new Error(`Reindex failed: ${error}`);
        }
    }

    public async optimizeIndex(): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // Trigger cache cleanup
            this.cache.clear();

            // Compact storage if possible
            if (this.storage instanceof SearchStorage) {
                await this.storage.clearIndices();
                await this.storage.storeIndex(
                    this.config.name,
                    this.indexManager.exportIndex()
                );
            }

            this.emitEvent({
                type: 'optimize:complete',
                timestamp: Date.now()
            });
        } catch (error) {
            this.emitEvent({
                type: 'optimize:error',
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw new Error(`Optimization failed: ${error}`);
        }
    }

    public  async handleVersioning(doc: IndexedDocument): Promise<void> {
        const existingDoc = await this.getDocument(doc.id);
        if (!existingDoc) return;

        const maxVersions = this.config.documentSupport?.versioning?.maxVersions ?? 10;
        const versions = existingDoc.versions || [];

        if (doc.fields.content !== existingDoc.fields.content) {
            versions.push({
                version: Number(existingDoc.fields.version),
                content: existingDoc.fields.content,
                modified: new Date(existingDoc.fields.modified || Date.now()),
                author: existingDoc.fields.author
            });

            // Keep only the latest versions
            if (versions.length > maxVersions) {
                versions.splice(0, versions.length - maxVersions);
            }

            doc.versions = versions;
            doc.fields.version = String(Number(doc.fields.version) + 1);
        }
    }
    private normalizeDocument(doc: IndexedDocument): IndexedDocument {
        if (!this.documentSupport) {
            return doc;
        }

        // Add NexusDocument fields if document support is enabled
        const now = new Date().toISOString();
        const normalizedFields = {
            ...doc.fields,
            title: doc.fields.title || '',
            content: doc.fields.content || '',
            type: doc.fields.type || 'document',
            tags: Array.isArray(doc.fields.tags) ? doc.fields.tags : [],
            category: doc.fields.category || '',
            author: doc.fields.author || '',
            created: doc.fields.created || now,
            modified: doc.fields.modified || now,
            status: doc.fields.status || 'draft',
            version: doc.fields.version || '1.0',
            locale: doc.fields.locale || ''
        };

        const normalizedMetadata = {
            ...doc.metadata,
            indexed: doc.metadata?.indexed || Date.now(),
            lastModified: doc.metadata?.lastModified || Date.now(),
            checksum: doc.metadata?.checksum,
            permissions: Array.isArray(doc.metadata?.permissions) ? doc.metadata.permissions : [],
            workflow: doc.metadata?.workflow
        };

        return new IndexedDocument(
            doc.id,
            normalizedFields,
            normalizedMetadata
        );
    }

    // Additional NexusDocument specific methods that are only available when document support is enabled
    public async getDocumentVersion(id: string, version: number): Promise<any | undefined> {
        if (!this.documentSupport) {
            throw new Error('Document support is not enabled');
        }

        const doc = await this.getDocument(id);
        return doc?.versions?.find(v => v.version === version);
    }

    public async restoreVersion(id: string, version: number): Promise<void> {
        if (!this.documentSupport) {
            throw new Error('Document support is not enabled');
        }

        const doc = await this.getDocument(id);
        if (!doc) {
            throw new Error(`Document ${id} not found`);
        }

        const targetVersion = await this.getDocumentVersion(id, version);
        if (!targetVersion) {
            throw new Error(`Version ${version} not found for document ${id}`);
        }

        const updatedDoc = this.normalizeDocument({
            ...doc,
            fields: {
                ...doc.fields,
                content: targetVersion.content,
                modified: new Date().toISOString(),
                version: String(Number(doc.fields.version) + 1)
            },
            normalizeFields: function (fields: IndexableDocumentFields): IndexableDocumentFields & { title: string; content: string; author: string; tags: string[];[key: string]: string | string[] | number | boolean | null; } {
                throw new Error("Function not implemented.");
            },
            normalizeMetadata: function (metadata?: DocumentMetadata): DocumentMetadata {
                throw new Error("Function not implemented.");
            },
            toObject: function () {
                throw new Error("Function not implemented.");
            },
            clone: function (): IndexedDocument {
                throw new Error("Function not implemented.");
            },
            update: function (updates: Partial<IndexedDocument>): IndexedDocument {
                throw new Error("Function not implemented.");
            },
            getField: function <T extends keyof IndexableDocumentFields>(field: T): IndexableDocumentFields[T] {
                throw new Error("Function not implemented.");
            },
            setField: function <T extends keyof IndexableDocumentFields>(field: T, value: IndexableDocumentFields[T]): void {
                throw new Error("Function not implemented.");
            },
            document: function (): IndexedDocument {
                throw new Error("Function not implemented.");
            },
            toJSON: function (): Record<string, any> {
                throw new Error("Function not implemented.");
            }
        });

        await this.updateDocument(updatedDoc);
    }

    public getStats(): {
        documentCount: number;
        indexSize: number;
        cacheSize: number;
        initialized: boolean;
    } {
        return {
            documentCount: this.documents.size,
            indexSize: this.indexManager.getSize(),
            cacheSize: this.cache.getSize(),
            initialized: this.isInitialized
        };
    }

    public isReady(): boolean {
        return this.isInitialized;
    }
}