import type {
    IndexConfig,
    IndexOptions,
    SearchContext,
    SearchOptions,
    SearchResult,
    SearchStats,
    SearchEventType
} from './types';
export {    IndexConfig,
    IndexOptions,
    SearchContext,
    SearchOptions,
    SearchResult,
    SearchStats,
    SearchEventType
}

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

// Event interfaces
export interface SearchEvent {
    type: SearchEventType;
    timestamp: number;
    data?: Record<string, unknown>;
    error?: Error;
}

// Document interfaces
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

// Internal interfaces
export interface InternalConfig extends IndexConfig {
    _id: string;
    _created: number;
    _updated: number;
}

export interface QueryContext extends SearchContext {
    _processed: boolean;
    _cached: boolean;
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

// Create a consolidated export object
export const NexusSearch = {
    DEFAULT_INDEX_OPTIONS,
    DEFAULT_SEARCH_OPTIONS,
    SearchError,
    IndexError,
    isSearchOptions,
    isIndexConfig,
    isSearchResult
};

export default NexusSearch;