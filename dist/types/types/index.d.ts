export * from './types';
export * from './errors';
export * from './events';
export * from './internal';
export * from './guards';
export * from './utils';
export * from './defaults';
export type SearchEventType = 'search:start' | 'search:complete' | 'search:error' | 'index:start' | 'index:complete' | 'index:error' | 'storage:error';
export interface SearchEvent {
    type: SearchEventType;
    timestamp: number;
    data?: any;
    error?: Error;
}
export interface SearchEventListener {
    (event: SearchEvent): void;
}
export interface IndexNode {
    id: string;
    value: any;
    score: number;
    children: Map<string, IndexNode>;
}
export interface SearchContext {
    query: string;
    options: SearchOptions;
    startTime: number;
    results: SearchResult<any>[];
    stats: SearchStats;
}
export interface TokenInfo {
    value: string;
    type: 'word' | 'operator' | 'modifier' | 'delimiter';
    position: number;
    length: number;
}
export declare function isSearchOptions(obj: any): obj is SearchOptions;
export declare function isIndexConfig(obj: any): obj is IndexConfig;
export declare function isSearchResult<T>(obj: any): obj is SearchResult<T>;
export declare function createSearchStats(): SearchStats;
export declare function createSearchContext(query: string, options?: SearchOptions): SearchContext;
export declare function createTokenInfo(value: string, type: TokenInfo['type'], position: number): TokenInfo;
export declare const DEFAULT_INDEX_OPTIONS: Required<IndexOptions>;
export declare const DEFAULT_SEARCH_OPTIONS: Required<SearchOptions>;
export declare namespace NexusSearch {
    interface InternalConfig extends IndexConfig {
        _id: string;
        _created: number;
        _updated: number;
    }
    interface QueryContext extends SearchContext {
        _processed: boolean;
        _cached: boolean;
    }
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
