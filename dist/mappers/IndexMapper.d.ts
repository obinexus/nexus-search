import { SearchableDocument, SearchResult, SerializedState } from "@/types";
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
    clear(): void;
}
