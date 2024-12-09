import type { IndexConfig, IndexOptions, SearchOptions, SearchResult } from './types';
export * from './types';
export declare const DEFAULT_INDEX_OPTIONS: Required<IndexOptions>;
export declare const DEFAULT_SEARCH_OPTIONS: Required<SearchOptions>;
export declare class SearchError extends Error {
    constructor(message: string);
}
export declare class IndexError extends Error {
    constructor(message: string);
}
export declare function isSearchOptions(obj: unknown): obj is SearchOptions;
export declare function isIndexConfig(obj: unknown): obj is IndexConfig;
export declare function isSearchResult<T>(obj: unknown): obj is SearchResult<T>;
export { SearchEngine } from './core/SearchEngine';
export { IndexManager } from './core/IndexManager';
export { QueryProcessor } from './core/QueryProcessor';
export { TrieNode } from './algorithms/trie/TrieNode';
export { TrieSearch } from './algorithms/trie/TrieSearch';
export { DataMapper } from './mappers/DataMapper';
export { IndexMapper } from './mappers/IndexMapper';
export { CacheManager, IndexedDB } from './storage/index';
export { PerformanceMonitor, createSearchableFields, optimizeIndex, getNestedValue, normalizeFieldValue, validateSearchOptions, validateIndexConfig, validateDocument } from './utils';
export declare const NexusSearch: {
    readonly DEFAULT_INDEX_OPTIONS: Required<IndexOptions>;
    readonly DEFAULT_SEARCH_OPTIONS: Required<SearchOptions>;
    readonly SearchError: typeof SearchError;
    readonly IndexError: typeof IndexError;
    readonly isSearchOptions: typeof isSearchOptions;
    readonly isIndexConfig: typeof isIndexConfig;
    readonly isSearchResult: typeof isSearchResult;
};
export default NexusSearch;
