import type {
    IndexConfig,
    IndexOptions,
    SearchContext,
    SearchOptions,
    SearchResult,
    SearchStats,
    SearchEventType,
    SearchEvent,
    DocumentLink,
    DocumentRank
} from './types';

// Re-export all types
export * from './types';

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

// Error types
export class SearchError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SearchError';
    }
}

export class IndexError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'IndexError';
    }
}

// Type guards
export function isSearchOptions(obj: unknown): obj is SearchOptions {
    if (!obj || typeof obj !== 'object') return false;
    const options = obj as Partial<SearchOptions>;
    
    return (
        (typeof options.fuzzy === 'undefined' || typeof options.fuzzy === 'boolean') &&
        (typeof options.maxResults === 'undefined' || typeof options.maxResults === 'number')
    );
}

export function isIndexConfig(obj: unknown): obj is IndexConfig {
    if (!obj || typeof obj !== 'object') return false;
    const config = obj as Partial<IndexConfig>;
    
    return Boolean(
        typeof config.name === 'string' &&
        typeof config.version === 'number' &&
        Array.isArray(config.fields)
    );
}

export function isSearchResult<T>(obj: unknown): obj is SearchResult<T> {
    if (!obj || typeof obj !== 'object') return false;
    const result = obj as Partial<SearchResult<T>>;
    
    return Boolean(
        'item' in result &&
        typeof result.score === 'number' &&
        Array.isArray(result.matches)
    );
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

// Create consolidated export object
export const NexusSearch = {
    DEFAULT_INDEX_OPTIONS,
    DEFAULT_SEARCH_OPTIONS,
    SearchError,
    IndexError,
    isSearchOptions,
    isIndexConfig,
    isSearchResult
} as const;

export default NexusSearch;