import { 
    IndexConfig, 
    IndexOptions, 
    SearchContext, 
    SearchOptions, 
    SearchResult,
    SearchStats 
} from './types';

export namespace NexusSearch {
    export interface IndexOptions extends IndexOptions {}
    export interface SearchStats extends SearchStats {}
    export interface SearchContext extends SearchContext {}
    export interface SearchOptions extends SearchOptions {}
    export interface SearchResult<T> extends SearchResult<T> {}
    export interface IndexConfig extends IndexConfig {}

    // Constants
    export const DEFAULT_INDEX_OPTIONS: Required<IndexOptions> = {
        caseSensitive: false,
        stemming: true,
        stopWords: ['the', 'a', 'an', 'and', 'or', 'but'],
        minWordLength: 2,
        maxWordLength: 50,
        fuzzyThreshold: 0.8
    };

    export const DEFAULT_SEARCH_OPTIONS: Required<SearchOptions> = {
        fuzzy: false,
        maxResults: 10,
        threshold: 0.5,
        fields: [],
        sortBy: 'score',
        sortOrder: 'desc',
        page: 1,
        pageSize: 10
    };

    // Rest of namespace implementation...
}

// Core exports
export { SearchEngine } from './core/SearchEngine';
export { IndexManager } from './core/IndexManager';
export { QueryProcessor } from './core/QueryProcessor';

// Algorithm exports
export { TrieNode } from './algorithms/trie/TrieNode';
export { TrieSearch } from './algorithms/trie/TrieSearch';

// Mapper exports
export { DataMapper } from './mappers/DataMapper';
export { IndexMapper } from './mappers/IndexMapper';

// Storage exports
export { CacheManager, IndexedDB } from './storage/index';

// Utility exports
export { 
    PerformanceMonitor,
    createSearchableFields,
    optimizeIndex,
    getNestedValue,
    normalizeFieldValue,
    validateSearchOptions,
    validateIndexConfig,
    validateDocument
} from './utils';

// Type exports
export type {
    IndexConfig,
    IndexOptions,
    SearchContext,
    SearchOptions,
    SearchResult,
    SearchStats
};

export default NexusSearch;

// Backward compatibility export
export type { NexusSearch as Types };