export interface IndexOptions {
    caseSensitive?: boolean;
    stemming?: boolean;
    stopWords?: string[];
    minWordLength?: number;
    maxWordLength?: number;
    fuzzyThreshold?: number;
}
export interface SearchStats {
    totalResults: number;
    searchTime: number;
    indexSize: number;
    queryComplexity: number;
}
export interface SearchContext {
    query: string;
    options: SearchOptions;
    startTime: number;
    results: SearchResult<any>[];
    stats: SearchStats;
}
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
export interface IndexConfig {
    name: string;
    version: number;
    fields: string[];
    options?: IndexOptions;
}
export declare const DEFAULT_INDEX_OPTIONS: Required<IndexOptions>;
export declare const DEFAULT_SEARCH_OPTIONS: Required<SearchOptions>;
export declare class SearchError extends Error {
    constructor(message: string);
}
export declare class IndexError extends Error {
    constructor(message: string);
}
export type SearchEventType = 'search:start' | 'search:complete' | 'search:error' | 'index:start' | 'index:complete' | 'index:error' | 'storage:error';
export interface SearchEvent {
    type: SearchEventType;
    timestamp: number;
    data?: any;
    error?: Error;
}
export interface DocumentLink {
    fromId: string;
    toId: string;
    weight: number;
}
export interface DocumentRank {
    id: string;
    rank: number;
    incomingLinks: number;
    outgoingLinks: number;
}
export interface InternalConfig extends IndexConfig {
    _id: string;
    _created: number;
    _updated: number;
}
export interface QueryContext extends SearchContext {
    _processed: boolean;
    _cached: boolean;
}
export declare function isSearchOptions(obj: any): obj is SearchOptions;
export declare function isIndexConfig(obj: any): obj is IndexConfig;
export declare function isSearchResult<T>(obj: any): obj is SearchResult<T>;
