import { CacheManager, SearchStorage } from "@/storage";
import { SearchOptions, SearchResult, IndexedDocument, SearchEngineConfig } from "@/types";
import { validateSearchOptions } from "@/utils";
import { IndexManager } from "./IndexManager";
import { QueryProcessor } from "./QueryProcessor";



export class SearchEngine {
    private indexManager: IndexManager;
    private queryProcessor: QueryProcessor;
    private storage: SearchStorage;
    private cache: CacheManager;
    private config: SearchEngineConfig;
    private isInitialized: boolean = false;

    constructor(config: SearchEngineConfig) {
        this.config = config;
        this.indexManager = new IndexManager(config);
        this.queryProcessor = new QueryProcessor();
        this.storage = new SearchStorage(config.storage);
        this.cache = new CacheManager();
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
                console.warn('Storage initialization failed, falling back to memory storage:', storageError);
                // Create new memory storage instance
                this.storage = new SearchStorage({ type: 'memory' });
                await this.storage.initialize();
            }

            // Load existing indexes
            await this.loadIndexes();
            this.isInitialized = true;
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
            // Add documents to index
            await this.indexManager.addDocuments(documents);

            // Store index in storage
            try {
                await this.storage.storeIndex(this.config.name, this.indexManager.exportIndex());
            } catch (storageError) {
                console.warn('Failed to persist index, continuing in memory:', storageError);
            }

            // Clear cache as index has changed
            this.cache.clear();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to add documents: ${errorMessage}`);
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
            return results;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Search failed: ${errorMessage}`);
        }
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

    async clearIndex(): Promise<void> {
        try {
            await this.storage.clearIndices();
        } catch (error) {
            console.warn('Failed to clear storage, continuing:', error);
        }
        this.indexManager.clear();
        this.cache.clear();
    }

    async close(): Promise<void> {
        try {
            await this.storage.close();
            this.cache.clear();
            this.isInitialized = false;
        } catch (error) {
            console.warn('Error during close:', error);
        }
    }
}