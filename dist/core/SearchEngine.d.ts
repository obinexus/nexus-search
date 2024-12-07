import { IndexConfig, SearchOptions, SearchResult } from '@/types/compactablity';
export declare class SearchEngine {
    private indexManager;
    private queryProcessor;
    private storage;
    private cache;
    private config;
    constructor(config: IndexConfig);
    initialize(): Promise<void>;
    addDocuments<T>(documents: T[]): Promise<void>;
    search<T>(query: string, options?: SearchOptions): Promise<SearchResult<T>[]>;
    private loadIndexes;
    private generateCacheKey;
    clearIndex(): Promise<void>;
}
