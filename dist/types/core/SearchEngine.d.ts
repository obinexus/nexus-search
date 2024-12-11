import { SearchOptions, SearchResult, IndexedDocument, SearchEngineConfig } from "@/types";
export declare class SearchEngine {
    private indexManager;
    private queryProcessor;
    private storage;
    private cache;
    private config;
    private isInitialized;
    constructor(config: SearchEngineConfig);
    initialize(): Promise<void>;
    addDocuments<T extends IndexedDocument>(documents: T[]): Promise<void>;
    search<T extends IndexedDocument>(query: string, options?: SearchOptions): Promise<SearchResult<T>[]>;
    private loadIndexes;
    private generateCacheKey;
    clearIndex(): Promise<void>;
    close(): Promise<void>;
}
