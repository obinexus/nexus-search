/// <reference types="node"/>
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
    DocumentRank,
} from './types/index';

// Export type declarations
export { DocumentLink, DocumentRank, SearchEvent, SearchEventType, SearchStats, SearchContext };

// Core imports
import { SearchEngine } from '@core/SearchEngine';
import { IndexManager } from '@storage/IndexManager';
import { QueryProcessor } from '@core/QueryProcessor';

// Algorithm imports
import { TrieNode } from '@algorithms/trie/TrieNode';
import { TrieSearch } from '@algorithms/trie/TrieSearch';

// Mapper imports
import { DataMapper } from '@/mappers/DataMapper';
import { IndexMapper } from '@/mappers/IndexMapper';

// Storage imports
import { CacheManager } from '@storage/CacheManager';
import { IndexedDB } from '@storage/IndexedDBService';

// Utility imports
import {
    PerformanceMonitor,
    createSearchableFields,
    optimizeIndex,
    getNestedValue,
    normalizeFieldValue,
    validateSearchOptions,
    validateIndexConfig,
    validateDocument
} from '@utils/index';

// Export all types
export * from './types/';

// Constants with proper type definitions
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
    pageSize: 10,
    regex: '',
    highlight: false,
    includeMatches: false,
    includeScore: false,
    includeStats: false,
    boost: {} // Changed from undefined to empty object to satisfy Required type
};

// Custom error classes
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

// Type guards with improved type checking
export function isSearchOptions(obj: unknown): obj is SearchOptions {
    if (!obj || typeof obj !== 'object') return false;
    const options = obj as Partial<SearchOptions>;
    
    return (
        (typeof options.fuzzy === 'undefined' || typeof options.fuzzy === 'boolean') &&
        (typeof options.maxResults === 'undefined' || typeof options.maxResults === 'number') &&
        (typeof options.threshold === 'undefined' || typeof options.threshold === 'number') &&
        (typeof options.fields === 'undefined' || Array.isArray(options.fields)) &&
        (typeof options.sortBy === 'undefined' || typeof options.sortBy === 'string') &&
        (typeof options.sortOrder === 'undefined' || ['asc', 'desc'].includes(options.sortOrder)) &&
        (typeof options.page === 'undefined' || typeof options.page === 'number') &&
        (typeof options.pageSize === 'undefined' || typeof options.pageSize === 'number') &&
        (typeof options.regex === 'undefined' || typeof options.regex === 'string' || options.regex instanceof RegExp) &&
        (typeof options.boost === 'undefined' || (typeof options.boost === 'object' && options.boost !== null))
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
        'id' in result &&
        'item' in result &&
        'document' in result &&
        typeof result.score === 'number' &&
        Array.isArray(result.matches)
    );
}

// Global type declaration
declare global {
    interface Window {
        NexusSearch: typeof NexusSearchNamespace;
    }
}

// Create namespace with proper type definition
const NexusSearchNamespace = {
    DEFAULT_INDEX_OPTIONS,
    DEFAULT_SEARCH_OPTIONS,
    SearchError,
    IndexError,
    SearchEngine,
    IndexManager,
    QueryProcessor,
    TrieNode,
    TrieSearch,
    isSearchOptions,
    isIndexConfig,
    isSearchResult,
} as const;

// Export individual components
export {
    SearchEngine,
    IndexManager,
    QueryProcessor,
    TrieNode,
    TrieSearch,
    DataMapper,
    IndexMapper,
    CacheManager,
    IndexedDB,
    PerformanceMonitor,
    createSearchableFields,
    optimizeIndex,
    getNestedValue,
    normalizeFieldValue,
    validateSearchOptions,
    validateIndexConfig,
    validateDocument
};

// Browser environment check and global initialization
if (typeof window !== 'undefined') {
    window.NexusSearch = NexusSearchNamespace;
}

// Export namespace
export const NexusSearch = NexusSearchNamespace;
export default NexusSearch;