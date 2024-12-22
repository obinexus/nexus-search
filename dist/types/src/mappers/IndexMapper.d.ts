import { SearchableDocument, SearchResult, SerializedState } from "@/types";
/**
 * IndexMapper class
 * @description IndexMapper class that indexes documents and performs search operations
 * @class IndexMapper
 * @implements {IndexMapper}
 * @method indexDocument
 * @method search
 *
 */
export declare class IndexMapper {
    private dataMapper;
    private trieSearch;
    constructor();
    indexDocument(document: SearchableDocument, id: string, fields: string[]): void;
    search(query: string, options?: {
        fuzzy?: boolean;
        maxResults?: number;
    }): SearchResult<string>[];
    exportState(): unknown;
    importState(state: {
        trie: SerializedState;
        dataMap: Record<string, string[]>;
    }): void;
    private tokenizeText;
    private calculateScore;
    removeDocument(id: string): void;
    addDocument(id: string, fields: string[], document: SearchableDocument): void;
    updateDocument(document: SearchableDocument, id: string, fields: string[]): void;
    clear(): void;
}
