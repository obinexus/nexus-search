import { IndexConfig, SearchOptions, SearchResult, IndexedDocument } from "@/types";
import { SerializedIndex } from "@/types/core";
export declare class IndexManager {
    getSize(): number;
    getAllDocuments(): Map<string, IndexedDocument>;
    private indexMapper;
    private config;
    private documents;
    constructor(config: IndexConfig);
    exportIndex(): SerializedIndex;
    importIndex(data: unknown): void;
    clear(): void;
    private generateDocumentId;
    private isValidIndexData;
    private isValidIndexState;
    private serializeDocument;
    addDocuments<T extends IndexedDocument>(documents: T[]): Promise<void>;
    updateDocument<T extends IndexedDocument>(document: T): Promise<void>;
    removeDocument(documentId: string): Promise<void>;
    search<T extends IndexedDocument>(query: string, options?: SearchOptions): Promise<SearchResult<T>[]>;
    hasDocument(id: string): boolean;
}