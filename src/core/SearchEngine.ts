// src/core/SearchEngine.ts
import { CacheManager, SearchStorage } from "@/storage";
import { 
    SearchOptions, 
    SearchResult, 
    IndexedDocument, 
    SearchEngineConfig,
    SearchableDocument,
    DocumentValue,
    SearchEventListener,
    SearchEvent
} from "@/types";
import { validateSearchOptions, createSearchableFields } from "@/utils";
import { IndexManager } from "../storage/IndexManager";
import { QueryProcessor } from "./QueryProcessor";
import { TrieSearch } from "@/algorithms/trie";

export class SearchEngine {
    private readonly indexManager: IndexManager;
    private readonly queryProcessor: QueryProcessor;
    private readonly storage: SearchStorage;
    private readonly cache: CacheManager;
    private readonly config: SearchEngineConfig;
    private readonly eventListeners: Set<SearchEventListener>;
    private readonly trie: TrieSearch;
    private isInitialized: boolean = false;
    private documents: Map<string, IndexedDocument>;

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

    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            // Initialize storage with fallback handling
            try {
                await this.storage.initialize();
            } catch (storageError) {
                this.emitEvent({
                    type: 'storage:error',
                    timestamp: Date.now(),
                    error: storageError instanceof Error ? storageError : new Error(String(storageError))
                });
                
                // Create new memory storage instance
                this.storage = new SearchStorage({ type: 'memory' });
                await this.storage.initialize();
            }

            // Load existing indexes
            await this.loadIndexes();
            this.isInitialized = true;

            this.emitEvent({
                type: 'search:start',
                timestamp: Date.now()
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to initialize search engine: ${errorMessage}`);
        }
    }

    async addDocuments<T extends IndexedDocument>(documents: T[]): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            this.emitEvent({
                type: 'index:start',
                timestamp: Date.now(),
                data: { documentCount: documents.length }
            });

            // Process and index each document
            for (const doc of documents) {
                const docId = doc.id || this.generateDocumentId();
                this.documents.set(docId, doc);

                // Create searchable fields
                const searchableDoc: SearchableDocument = {
                    id: docId,
                    content: createSearchableFields({
                        content: doc.fields as Record<string, DocumentValue>,
                        id: docId
                    }, this.config.fields)
                };

                // Index each field
                for (const field of this.config.fields) {
                    if (searchableDoc.content[field]) {
                        const content = String(searchableDoc.content[field]).toLowerCase();
                        const words = content.split(/\s+/).filter(Boolean);

                        for (const word of words) {
                            this.trie.insert(word, docId);
                        }
                    }
                }
            }

            // Add documents to index manager
            await this.indexManager.addDocuments(documents);

            // Store index in storage
            try {
                await this.storage.storeIndex(this.config.name, this.indexManager.exportIndex());
            } catch (storageError) {
                this.emitEvent({
                    type: 'storage:error',
                    timestamp: Date.now(),
                    error: storageError instanceof Error ? storageError : new Error(String(storageError))
                });
            }

            // Clear cache as index has changed
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
    }

    async search<T extends IndexedDocument>(
        query: string,
        options: SearchOptions = {}
    ): Promise<SearchResult<T>[]> {
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

        // Try cache first
        const cacheKey = this.generateCacheKey(query, options);
        const cachedResults = this.cache.get(cacheKey);
        if (cachedResults) {
            return cachedResults as SearchResult<T>[];
        }

        try {
            // Process query and perform search
            const processedQuery = this.queryProcessor.process(query);
            const results = await this.indexManager.search<T>(processedQuery, options);

            // Cache results
            this.cache.set(cacheKey, results);

            this.emitEvent({
                type: 'search:complete',
                timestamp: Date.now(),
                data: {
                    query,
                    options,
                    resultCount: results.length,
                    searchTime: Date.now() - searchStartTime
                }
            });

            return results;
        } catch (error) {
            this.emitEvent({
                type: 'search:error',
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw new Error(`Search failed: ${error}`);
        }
    }

    addEventListener(listener: SearchEventListener): void {
        this.eventListeners.add(listener);
    }

    removeEventListener(listener: SearchEventListener): void {
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

    async clearIndex(): Promise<void> {
        try {
            await this.storage.clearIndices();
        } catch (error) {
            console.warn('Failed to clear storage, continuing:', error);
        }
        this.documents.clear();
        this.trie = new TrieSearch();
        this.indexManager.clear();
        this.cache.clear();
    }

    async close(): Promise<void> {
        try {
            await this.storage.close();
            this.cache.clear();
            this.documents.clear();
            this.isInitialized = false;
        } catch (error) {
            console.warn('Error during close:', error);
        }
    }

    // Debug methods
    getIndexedDocumentCount(): number {
        return this.documents.size;
    }

    getTrieState(): unknown {
        return this.trie.exportState();
    }
}