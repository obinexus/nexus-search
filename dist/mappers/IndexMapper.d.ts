import { SearchResult } from '@/types/search';
export declare class IndexMapper {
    private dataMapper;
    private trieSearch;
    constructor();
    indexDocument(document: any, id: string, fields: string[]): void;
    search(query: string, options?: {
        fuzzy?: boolean;
        maxResults?: number;
    }): SearchResult<string>[];
    exportState(): any;
    importState(state: any): void;
    private tokenizeText;
    private calculateScore;
    clear(): void;
}
