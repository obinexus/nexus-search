export interface SearchOptions {
    fuzzy?: boolean;
    maxResults?: number;
    threshold?: number;
    fields?: string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
}
export interface SearchResult<T> {
    item: T;
    score: number;
    matches: string[];
    highlights?: Record<string, string[]>;
}
export interface SearchStats {
    totalResults: number;
    searchTime: number;
    indexSize: number;
    queryComplexity: number;
}
