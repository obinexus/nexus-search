import { MapperState, SearchableDocument, SearchResult } from "@/types";
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
    importState(state: MapperState): void;
    private tokenizeText;
    private calculateScore;
    clear(): void;
}
