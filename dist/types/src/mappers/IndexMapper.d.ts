import { IndexedDocument, SearchableDocument, SearchResult, SerializedState } from "@/types";
/**
 * IndexMapper class
 * Manages document indexing and search operations using trie data structure
 */
export declare class IndexMapper {
    private dataMapper;
    private trieSearch;
    private documents;
    private documentScores;
    constructor(state?: {
        dataMap?: Record<string, string[]>;
    });
    /**
     * Index a document for search operations
     */
    indexDocument(document: SearchableDocument, id: string, fields: string[]): void;
    /**
     * Search for documents matching the query
     */
    search(query: string, options?: {
        fuzzy?: boolean;
        maxResults?: number;
    }): SearchResult<string>[];
    private normalizeValue;
    private tokenizeText;
    private calculateScore;
    private calculateTermFrequency;
    removeDocument(id: string): void;
    addDocument(document: SearchableDocument, id: string, fields: string[]): void;
    updateDocument(document: SearchableDocument, id: string, fields: string[]): void;
    getDocumentById(id: string): IndexedDocument | undefined;
    getAllDocuments(): Map<string, IndexedDocument>;
    exportState(): unknown;
    importState(state: {
        trie: SerializedState;
        dataMap: Record<string, string[]>;
        documents?: [string, IndexedDocument][];
    }): void;
    clear(): void;
}
