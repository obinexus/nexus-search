declare class SearchError extends Error {
    constructor(message: string);
}
declare class IndexError extends Error {
    constructor(message: string);
}
declare class ValidationError extends Error {
    constructor(message: string);
}
declare class StorageError extends Error {
    constructor(message: string);
}

type SearchEventType = 'search:start' | 'search:complete' | 'search:error' | 'index:start' | 'index:complete' | 'index:error' | 'storage:error';
interface SearchEvent {
    type: SearchEventType;
    timestamp: number;
    data?: any;
    error?: Error;
}
interface SearchEventListener {
    (event: SearchEvent): void;
}
interface IndexNode {
    id: string;
    value: any;
    score: number;
    children: Map<string, IndexNode>;
}
interface SearchContext {
    query: string;
    options: SearchOptions;
    startTime: number;
    results: SearchResult<any>[];
    stats: SearchStats;
}
interface TokenInfo {
    value: string;
    type: 'word' | 'operator' | 'modifier' | 'delimiter';
    position: number;
    length: number;
}
declare function isSearchOptions(obj: any): obj is SearchOptions;
declare function isIndexConfig(obj: any): obj is IndexConfig;
declare function isSearchResult<T>(obj: any): obj is SearchResult<T>;
declare function createSearchStats(): SearchStats;
declare function createSearchContext(query: string, options?: SearchOptions): SearchContext;
declare function createTokenInfo(value: string, type: TokenInfo['type'], position: number): TokenInfo;
declare const DEFAULT_INDEX_OPTIONS: Required<IndexOptions>;
declare const DEFAULT_SEARCH_OPTIONS: Required<SearchOptions>;
declare namespace NexusSearch {
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
interface SearchOptions {
    fuzzy?: boolean;
    maxResults?: number;
    threshold?: number;
    fields?: string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
}
interface SearchResult<T> {
    item: T;
    score: number;
    matches: string[];
    highlights?: Record<string, string[]>;
}
interface IndexConfig {
    name: string;
    version: number;
    fields: string[];
    options?: IndexOptions;
}
interface IndexOptions {
    caseSensitive?: boolean;
    stemming?: boolean;
    stopWords?: string[];
    minWordLength?: number;
    maxWordLength?: number;
    fuzzyThreshold?: number;
}
interface SearchStats {
    totalResults: number;
    searchTime: number;
    indexSize: number;
    queryComplexity: number;
}

export { DEFAULT_INDEX_OPTIONS, DEFAULT_SEARCH_OPTIONS, type IndexConfig, IndexError, type IndexNode, type IndexOptions, NexusSearch, type SearchContext, SearchError, type SearchEvent, type SearchEventListener, type SearchEventType, type SearchOptions, type SearchResult, type SearchStats, StorageError, type TokenInfo, ValidationError, createSearchContext, createSearchStats, createTokenInfo, isIndexConfig, isSearchOptions, isSearchResult };
