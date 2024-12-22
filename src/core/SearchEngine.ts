import { CacheManager, IndexedDocument, SearchStorage } from "@/storage";
import { 
    SearchOptions, 
    SearchResult, 
    SearchEngineConfig,
    SearchEventListener,
    SearchEvent,
} from "@/types";
import { validateSearchOptions, createSearchableFields } from "@/utils";
import { IndexManager } from "../storage/IndexManager";
import { QueryProcessor } from "./QueryProcessor";
import { TrieSearch } from "@/algorithms/trie";

export class SearchEngine {
    private readonly indexManager: IndexManager;
    private readonly queryProcessor: QueryProcessor;
    private storage: SearchStorage;
    private readonly cache: CacheManager;
    private readonly config: SearchEngineConfig;
    private readonly eventListeners: Set<SearchEventListener>;
    private trie: TrieSearch;
    private isInitialized: boolean = false;
    private documents: Map<string, IndexedDocument & { fields: { [key: string]: string } }>;

    constructor(config: SearchEngineConfig) {
        this.config = config;
        this.indexManager = new IndexManager(config);
        this.queryProcessor = new QueryProcessor();
        this.storage = new SearchStorage(config.storage);
        this.cache = new CacheManager();
        this.eventListeners = new Set();
        this.trie = new TrieSearch();
        this.documents = new Map();
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

    public async addDocuments(documents: IndexedDocument[]): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            this.emitEvent({
                type: 'index:start',
                timestamp: Date.now(),
                data: { documentCount: documents.length }
            });

            for (const doc of documents) {
                const docId = doc.id || this.generateDocumentId();
                 const indexedDoc = {

                    ...IndexedDocument.fromObject({

                        ...doc,

                        id: docId,

                        metadata: {

                            ...doc.metadata,

                            indexed: Date.now(),

                            lastModified: Date.now()

                        },

                        toObject: function (): IndexedDocument {

                            throw new Error("Function not implemented.");

                        }

                    }),

                    fields: doc.fields

                };



                this.documents.set(docId, indexedDoc);


                this.documents.set(docId, indexedDoc);

                const searchableContent = createSearchableFields(
                    { content: doc.fields, id: docId },
                    this.config.fields
                );

                for (const field of this.config.fields) {
                    if (searchableContent[field]) {
                        const words = searchableContent[field]
                            .toLowerCase()
                            .split(/\s+/)
                            .filter(Boolean);

                        for (const word of words) {
                            this.trie.insert(word, docId);
                        }
                    }
                }
            }

            await this.indexManager.addDocuments(
                Array.from(this.documents.values()).map(doc => doc.toObject())
            );

            try {
                await this.storage.storeIndex(this.config.name, this.indexManager.exportIndex());
            } catch (storageError) {
                this.emitEvent({
                    type: 'storage:error',
                    timestamp: Date.now(),
                    error: storageError instanceof Error ? storageError : new Error(String(storageError))
                });
            }

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
            throw new Error(`Failed to add documents: ${error}`);
        }
    }public async search(
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
            const processedQuery = this.queryProcessor.process(query);
            const searchTerms = processedQuery.toLowerCase().split(/\s+/).filter(Boolean);
            const searchFields = options.fields || this.config.fields;
            
            // Get all matching documents from trie
            const matchingDocIds = new Set<string>();
            for (const term of searchTerms) {
                const matches = this.trie.search(term);
                matches.forEach(id => matchingDocIds.add(id));
            }

            // Score and rank the matching documents
            const results: SearchResult<IndexedDocument>[] = [];
            for (const docId of matchingDocIds) {
                const doc = this.documents.get(docId);
                if (!doc) continue;

                let score = 0;
                const matches: string[] = [];

                for (const field of searchFields) {
                    const fieldContent = String(doc.fields[field] || '').toLowerCase();
                    const fieldBoost = (options.boost?.[field] || 1);

                    for (const term of searchTerms) {
                        if (fieldContent.includes(term)) {
                            // Basic scoring: term frequency * field boost
                            const termFrequency = (fieldContent.match(new RegExp(term, 'gi')) || []).length;
                            score += termFrequency * fieldBoost;
                            matches.push(term);
                        }

                        // Fuzzy matching if enabled
                        if (options.fuzzy && this.calculateLevenshteinDistance(term, fieldContent) <= 2) {
                            score += 0.5 * fieldBoost;
                            matches.push(term);
                        }
                    }
                }

                if (score > 0) {
                    results.push({
                        id: docId,
                        item: doc,
                        document: doc,
                        score: score / searchTerms.length, // Normalize score
                        matches: Array.from(new Set(matches)),
                        metadata: {
                            ...doc.metadata,
                            lastAccessed: Date.now()
                        }
                    });
                }
            }

            // Sort results by score
            const sortedResults = results.sort((a, b) => b.score - a.score);

            // Apply pagination if specified
            const page = options.page || 1;
            const pageSize = options.pageSize || 10;
            const start = (page - 1) * pageSize;
            const paginatedResults = sortedResults.slice(start, start + pageSize);

            // Cache the results
            this.cache.set(cacheKey, paginatedResults);

            this.emitEvent({
                type: 'search:complete',
                timestamp: Date.now(),
                data: {
                    query,
                    options,
                    resultCount: paginatedResults.length,
                    searchTime: Date.now() - searchStartTime
                }
            });

            return paginatedResults;
        } catch (error) {
            this.emitEvent({
                type: 'search:error',
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw new Error(`Search failed: ${error}`);
        }
    }

    private calculateLevenshteinDistance(a: string, b: string): number {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(null));

        for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
        for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }

        return matrix[a.length][b.length];
    }

    public async updateDocument(document: IndexedDocument): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const documentId = document.id;
        if (!documentId || !this.documents.has(documentId)) {
            throw new Error(`Document ${documentId} not found`);
        }

        try {
            const updatedDoc = IndexedDocument.fromObject({
                ...document,
                metadata: {
                    ...document.metadata,
                    lastModified: Date.now()
                },
                toObject: function (): IndexedDocument {
                    throw new Error("Function not implemented.");
                }
            });

            await this.removeDocument(documentId);
            await this.addDocuments([updatedDoc]);

            this.emitEvent({
                type: 'update:complete',
                timestamp: Date.now(),
                data: { documentId }
            });
        } catch (error) {
            this.emitEvent({
                type: 'update:error',
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw new Error(`Failed to update document: ${error}`);
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

  
    private async loadIndexes(): Promise<void> {
        try {
            const storedIndex = await this.storage.getIndex(this.config.name);
            if (storedIndex) {
                this.indexManager.importIndex(storedIndex);
                
                // Reconstruct documents from stored index
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

    public async close(): Promise<void> {
        try {
            await this.storage.close();
            this.cache.clear();
            this.documents.clear();
            this.isInitialized = false;
        } catch (error) {
            console.warn('Error during close:', error);
        }
    }

    public get isReady(): boolean {
        return this.isInitialized;
    }

    public getAllDocuments(): IndexedDocument[] {
        return Array.from(this.documents.values());
    }

    public getDocumentById(id: string): IndexedDocument | undefined {
        return this.documents.get(id);
    }

    public getIndexedDocumentCount(): number {
        return this.documents.size;
    }

    public getTrieState(): unknown {
        return this.trie.exportState();
    }
}