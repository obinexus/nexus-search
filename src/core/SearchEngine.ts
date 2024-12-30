
import { CacheManager, IndexedDocument, SearchStorage } from "@/storage";

import {
    SearchOptions,
    SearchResult,
    SearchEngineConfig,
    SearchEventListener,
    SearchEvent,
    IndexNode,
    DocumentContent,
    BaseFields,
    DocumentMetadata,
    DocumentStatus,
    ExtendedSearchOptions,
    RegexSearchConfig,
    RegexSearchResult,
    
} from "@/types";
import { validateSearchOptions, bfsRegexTraversal, dfsRegexTraversal } from "@/utils";
import { IndexManager } from "../storage/IndexManager";
import { QueryProcessor } from "./QueryProcessor";
import { TrieSearch } from "@/algorithms/trie";
import { NexusDocumentAdapter } from "@/adapters";


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
        this.documentSupport = config.documentSupport?.enabled ?? false;
        this.config = config;
        this.indexManager = new IndexManager(config);
        this.queryProcessor = new QueryProcessor();
        this.storage = new SearchStorage(config.storage);
        this.cache = new CacheManager();
        this.eventListeners = new Set();
        this.trie = new TrieSearch();
        this.documents = new Map();
        this.trieRoot = { id: '', value: '', score: 0, children: new Map(), depth: 0 };
    } 
   
    private extractRegexMatches(
        doc: IndexedDocument,
        positions: Array<[number, number]>,
        options: SearchOptions
    ): string[] {
        const searchFields = options.fields || this.config.fields;
        const matches = new Set<string>();

        for (const field of searchFields) {
            const fieldContent = String(doc.fields[field] || '');
            for (const [start, end] of positions) {
                if (start >= 0 && end <= fieldContent.length) {
                    matches.add(fieldContent.slice(start, end));
                }
            }
        }

        return Array.from(matches);
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

    /**
     * Add documents to the search engine
     */
    public async addDocuments(documents: IndexedDocument[]): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const normalizedDocs = documents.map(doc => this.normalizeDocument(doc));
            
            if (this.documentSupport && this.config.documentSupport?.validation) {
                this.validateDocuments(normalizedDocs);
            }

            for (const doc of normalizedDocs) {
                this.documents.set(doc.id, doc);

                // Convert type-specific fields with proper type safety
                const adaptedDoc = new NexusDocumentAdapter({
                    id: doc.id,
                    fields: {
                        ...doc.fields,
                        title: String(doc.fields.title || ''),
                        content: this.normalizeContent(doc.fields.content),
                        author: String(doc.fields.author || ''),
                        type: String(doc.fields.type || 'document'),
                        tags: Array.isArray(doc.fields.tags) ? doc.fields.tags.map(String) : [],
                        category: String(doc.fields.category || ''),
                        created: this.normalizeDate(doc.fields.created) || new Date().toISOString(),
                        modified: this.normalizeDate(doc.fields.modified) || new Date().toISOString(),
                        status: this.normalizeStatus(doc.fields.status) || 'draft',
                        version: String(doc.fields.version || '1.0'),
                        locale: String(doc.fields.locale || '')
                    },
                    metadata: {
                        ...doc.metadata,
                        indexed: doc.metadata?.indexed ?? Date.now(),
                        lastModified: doc.metadata?.lastModified ?? Date.now()
                    },
                    versions: doc.versions,
                    relations: doc.relations
                });

                this.trie.addDocument(adaptedDoc);
                this.indexManager.addDocument(adaptedDoc);
            }

            await this.storage.storeIndex(this.config.name, this.indexManager.exportIndex());
            this.cache.clear();

            this.emitEvent({
                type: 'index:complete',
                timestamp: Date.now(),
                data: { documentCount: documents.length }
            });
        } catch (error) {
            this.emitEvent({
                type: 'index:error',
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw error;
        }
    }

    /**
     * Helper method to normalize document content
     */
    private normalizeContent(content: unknown): DocumentContent {
        if (!content) return {};
        if (typeof content === 'string') return { text: content };
        if (typeof content === 'object') return content as DocumentContent;
        return { value: String(content) };
    }

    /**
     * Helper method to normalize date strings
     */
    private normalizeDate(date: unknown): string | undefined {
        if (!date) return undefined;
        if (date instanceof Date) return date.toISOString();
        if (typeof date === 'string') return new Date(date).toISOString();
        if (typeof date === 'number') return new Date(date).toISOString();
        return undefined;
    }

    /**
     * Helper method to normalize document status
     */
    private normalizeStatus(status: unknown): DocumentStatus | undefined {
        if (!status) return undefined;
        const statusStr = String(status).toLowerCase();
        
        switch (statusStr) {
            case 'draft':
            case 'published':
            case 'archived':
                return statusStr as DocumentStatus;
            case 'active':
                return 'published';
            default:
                return 'draft';
        }
    }

  

    public async updateDocument(document: IndexedDocument): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const normalizedDoc = this.normalizeDocument(document);
        await this.handleVersioning(normalizedDoc);

        if (this.documentSupport && this.config.documentSupport?.versioning?.enabled) {
            await this.handleVersioning(normalizedDoc);
        }

        this.documents.set(normalizedDoc.id, normalizedDoc);
        this.trie.addDocument(normalizedDoc);
        await this.indexManager.updateDocument(normalizedDoc);
    }    public async search(
        query: string,
        options: ExtendedSearchOptions = {}
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
            let results: RegexSearchResult[] | Array<{ id: string; score: number }>;
    
            if (options.regex) {
                results = await this.performRegexSearch(query, options);
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
/**
 * Performs regex-based search using either BFS or DFS traversal
 */
private async performRegexSearch(
    query: string,
    options: ExtendedSearchOptions
): Promise<SearchResult<IndexedDocument>[]> {
    const regexConfig: RegexSearchConfig = {
        maxDepth: options.regexConfig?.maxDepth || 50,
        timeoutMs: options.regexConfig?.timeoutMs || 5000,
        caseSensitive: options.regexConfig?.caseSensitive || false,
        wholeWord: options.regexConfig?.wholeWord || false
    };

    const regex = this.createRegexFromOption(options.regex || '');

    // Determine search strategy based on regex complexity
    const regexResults = this.isComplexRegex(regex) ?
        await dfsRegexTraversal(
            this.trieRoot,
            regex,
            options.maxResults || 10,
            regexConfig
        ) :
        await bfsRegexTraversal(
            this.trieRoot,
            regex,
            options.maxResults || 10,
            regexConfig
        );

    // Map regex results to SearchResult format
    return regexResults.map(result => {
        const document = this.documents.get(result.id);
        if (!document) {
            throw new Error(`Document not found for id: ${result.id}`);
        }

        return {
            id: result.id,
            docId: result.id,
            term: result.matches[0] || query, // Use first match or query as term
            score: result.score,
            matches: result.matches,
            document: document,
            item: document,
            metadata: {
                ...document.metadata,
                lastAccessed: Date.now()
            }
        };
    }).filter(result => result.score >= (options.minScore || 0));
}



    private async performBasicSearch(
        searchTerms: string[],
        options: SearchOptions
    ): Promise<Array<{ id: string; score: number }>> {
        const results = new Map<string, { score: number; matches: Set<string> }>();
    
        for (const term of searchTerms) {
            const matches = options.fuzzy ?
                this.trie.fuzzySearch(term, options.maxDistance || 2) :
                this.trie.search(term);
    
            for (const match of matches) {
                const docId = match.docId;
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

    /**
 * Creates a RegExp object from various input types
 */
private createRegexFromOption(regexOption: string | RegExp | object): RegExp {
    if (regexOption instanceof RegExp) {
        return regexOption;
    }
    if (typeof regexOption === 'string') {
        return new RegExp(regexOption);
    }
    if (typeof regexOption === 'object' && regexOption !== null) {
        const pattern = (regexOption as any).pattern;
        const flags = (regexOption as any).flags;
        return new RegExp(pattern || '', flags || '');
    }
    return new RegExp('');
}


/**
 * Determines if a regex pattern is complex
 */
private isComplexRegex(regex: RegExp): boolean {
    const pattern = regex.source;
    return (
        pattern.includes('{') ||
        pattern.includes('+') ||
        pattern.includes('*') ||
        pattern.includes('?') ||
        pattern.includes('|') ||
        pattern.includes('(?') ||
        pattern.includes('[') ||
        pattern.length > 20  // Additional complexity check based on pattern length
    );
}
    private async processSearchResults(
        results: RegexSearchResult[] | Array<{ id: string; score: number }>,
        options: SearchOptions
    ): Promise<SearchResult<IndexedDocument>[]> {
        const processedResults: SearchResult<IndexedDocument>[] = [];
    
        for (const result of results) {
            const doc = this.documents.get(result.id);
            if (!doc) continue;
    
            const searchResult: SearchResult<IndexedDocument> = {
                id: result.id,
                docId: result.id,
                item: doc,
                score: (result as { score: number }).score ? this.normalizeScore((result as { score: number }).score) : (result as { score: number }).score,
                matches: [],
                metadata: {
                    ...doc.metadata,
                    lastAccessed: Date.now()
                },
                document: doc,
                term: 'matched' in result ? String(result.matched) : '',
            };
    
            if (options.includeMatches) {
                if ('positions' in result) {
                    // Handle regex search results
                    searchResult.matches = this.extractRegexMatches(doc, result.positions as [number, number][], options);
                } else {
                    // Handle basic search results
                    searchResult.matches = this.extractMatches(doc, options);
                }
            }
    
            processedResults.push(searchResult);
        }
    
        return this.applyPagination(processedResults, options);
    }

  
    public getTrieState(): unknown {
        return this.trie.serializeState();
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
    
    public async removeDocument(documentId: string): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.documents.has(documentId)) {
            throw new Error(`Document ${documentId} not found`);
        }

        try {
            this.documents.delete(documentId);
            this.trie.removeDocument(documentId);
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

 

    private async loadIndexes(): Promise<void> {
        try {
            const storedIndex = await this.storage.getIndex(this.config.name);
            if (storedIndex) {
                this.indexManager.importIndex(storedIndex);
                const indexedDocs = this.indexManager.getAllDocuments();
                for (const doc of indexedDocs) {
                    this.documents.set(doc[1].id, IndexedDocument.fromObject({
                        id: doc[1].id,
                        fields: {
                            title: doc[1].fields.title,
                            content: doc[1].fields.content,
                            author: doc[1].fields.author,
                            tags: doc[1].fields.tags,
                            version: doc[1].fields.version
                        },
                        metadata: doc[1].metadata
                    }));
                }
            }
        } catch (error) {
            console.warn('Failed to load stored index, starting fresh:', error);
        }
    }

    private generateCacheKey(query: string, options: SearchOptions): string {
        return `${this.config.name}-${query}-${JSON.stringify(options)}`;
    }

    public addEventListener(listener: SearchEventListener): void {
        this.eventListeners.add(listener);
    }

    public removeEventListener(listener: SearchEventListener): void {
        this.eventListeners.delete(listener);
    }

   /**
     * Emit search engine events
     */
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

        const normalizedFields: BaseFields = {
            title: doc.fields.title || '',
            content: doc.fields.content as DocumentContent,
            author: doc.fields.author || '',
            tags: Array.isArray(doc.fields.tags) ? doc.fields.tags : [],
            version: doc.fields.version || '1.0',
        };

        const normalizedMetadata: DocumentMetadata = {
            indexed: doc.metadata?.indexed || Date.now(),
            lastModified: doc.metadata?.lastModified || Date.now(),
        };

        return new IndexedDocument(
            doc.id,
            normalizedFields,
            normalizedMetadata
        );
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

        const updatedDoc = new IndexedDocument(
            doc.id,
            {
                ...doc.fields,
                content: targetVersion.content,
                modified: new Date().toISOString(),
                version: String(Number(doc.fields.version) + 1)
            },
            {
                ...doc.metadata,
                lastModified: Date.now()
            }
        );

        await this.updateDocument(updatedDoc);
    }

    // Additional NexusDocument specific methods that are only available when document support is enabled
    public async getDocumentVersion(id: string, version: number): Promise<any | undefined> {
        if (!this.documentSupport) {
            throw new Error('Document support is not enabled');
        }

        const doc = await this.getDocument(id);
        return doc?.versions?.find(v => v.version === version);
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