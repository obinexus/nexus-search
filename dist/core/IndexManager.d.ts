import { IndexConfig, SearchOptions, SearchResult } from "@/types";
export declare class IndexManager {
    private indexMapper;
    private config;
    private documents;
    constructor(config: IndexConfig);
    addDocuments<T>(documents: T[]): Promise<void>;
    search<T>(query: string, options: SearchOptions): Promise<SearchResult<T>[]>;
    exportIndex(): any;
    importIndex(data: any): void;
    clear(): void;
    private generateDocumentId;
}
