import { IndexConfig, SearchOptions, SearchResult, IndexedDocument } from "@/types";
export declare class SearchEngine {
    private indexManager;
    private queryProcessor;
    private storage;
    private cache;
    private config;
    constructor(config: IndexConfig);
    initialize(): Promise<void>;
    addDocuments<T extends IndexedDocument>(documents: T[]): Promise<void>;
    search<T extends IndexedDocument>(query: string, options?: SearchOptions): Promise<SearchResult<T>[]>;
    private loadIndexes;
    private generateCacheKey;
    clearIndex(): Promise<void>;
}
