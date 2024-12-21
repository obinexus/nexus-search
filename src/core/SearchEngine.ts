/**
 * SearchEngine.ts - Reference Implementation
 * 
 * This file contains the complete unoptimized version of the SearchEngine class
 * with all features intact. This version includes:
 * - Full event handling
 * - Debug methods
 * - Storage fallback
 * - Cache management
 * - Document indexing
 * - Search functionality
 */

// Core imports
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

/**
 * SearchEngine class provides full-text search functionality with:
 * - Document indexing and storage
 * - Search with fuzzy matching
 * - Event handling
 * - Cache management
 * - Debug capabilities
 */
export class SearchEngine {
    // Core components
    private readonly indexManager: IndexManager;
    private readonly queryProcessor: QueryProcessor;
    private storage: SearchStorage; // Mutable for fallback
    private readonly cache: CacheManager;
    private readonly config: SearchEngineConfig;
    private readonly eventListeners: Set<SearchEventListener>;
    private trie: TrieSearch; // Mutable for reset
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

    /**
     * Initializes the search engine and storage
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

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
                type: 'search:start',
                timestamp: Date.now()
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to initialize search engine: ${errorMessage}`);
        }
    }

    /**
     * Adds documents to the search index
     */
    public async addDocuments<T extends IndexedDocument>(documents: T[]): Promise<void> {
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
                this.documents.set(docId, doc);

                const searchableDoc: SearchableDocument = {
                    id: docId,
                    content: createSearchableFields({
                        content: doc.fields as Record<string, DocumentValue>,
                        id: docId
                    }, this.config.fields)
                };

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

            await this.indexManager.addDocuments(documents);

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
    }

    /**
     * Searches the index for documents matching the query
     */
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

        const cacheKey = this.generateCacheKey(query, options);
        const cachedResults = this.cache.get(cacheKey);
        if (cachedResults) {
            return cachedResults as SearchResult<T>[];
        }

        try {
            const processedQuery = this.queryProcessor.process(query);
            const results = await this.indexManager.search<T>(processedQuery, options);

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

    public async removeDocument(documentId: string): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.documents.has(documentId)) {
            throw new Error(`Document ${documentId} not found`);
        }

        try {
            this.emitEvent({
                type: 'remove:start',
                timestamp: Date.now(),
                data: { documentId }
            });

            this.documents.delete(documentId);
            await this.indexManager.removeDocument(documentId);

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

    public async updateDocument<T extends IndexedDocument>(document: T): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const documentId = document.id;
        if (!documentId || !this.documents.has(documentId)) {
            throw new Error(`Document ${documentId} not found`);
        }

        try {
            this.emitEvent({
                type: 'update:start',
                timestamp: Date.now(),
                data: { documentId }
            });

            this.documents.set(documentId, document);

            const searchableDoc: SearchableDocument = {
                id: documentId,
                content: createSearchableFields({
                    content: document.fields as Record<string, DocumentValue>,
                    id: documentId
                }, this.config.fields)
            };

            for (const field of this.config.fields) {
                if (searchableDoc.content[field]) {
                    const content = String(searchableDoc.content[field]).toLowerCase();
                    const words = content.split(/\s+/).filter(Boolean);

                    for (const word of words) {
                        this.trie.insert(word, documentId);
                    }
                }
            }

            await this.indexManager.updateDocument(document);

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


    // Event handling methods
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

    // Utility methods
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

    // Reset methods
    // private resetTrie(): void {
    //     this.trie = new TrieSearch();
    // }
    
    // private resetStorage(options: { type: 'memory' }): void {
    //     this.storage = new SearchStorage(options);
    // }

    // Cleanup methods
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

    get isReady(): boolean {
        return this.isInitialized;
    }

    public getAllDocuments(): IndexedDocument[] {
        return Array.from(this.documents.values());
    }

    // Debug methods
    getIndexedDocumentCount(): number {
        return this.documents.size;
    }

    getTrieState(): unknown {
        return this.trie.exportState();
    }
}