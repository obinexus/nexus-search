import { IndexConfig, SearchOptions, SearchResult, IndexedDocument } from "@/types";
import { SerializedIndex } from "@/types/core";
export declare class IndexManager {
    private indexMapper;
    private config;
    private documents;
    constructor(config: IndexConfig);
    addDocuments<T extends IndexedDocument>(documents: T[]): Promise<void>;
    search<T extends IndexedDocument>(query: string, options: SearchOptions): Promise<SearchResult<T>[]>;
    exportIndex(): SerializedIndex;
    importIndex(data: unknown): void;
    clear(): void;
    private generateDocumentId;
    private isValidIndexData;
    private serializeDocument;
}
