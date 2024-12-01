import { SearchResult } from '../types';
export declare class IndexMapper {
    private dataMapper;
    private trieSearch;
    constructor();
    indexDocument(document: any, id: string, fields: string[]): void;
    search(query: string, options?: {
        fuzzy?: boolean;
        maxResults?: number;
    }): SearchResult<string>[];
    private calculateScore;
}
