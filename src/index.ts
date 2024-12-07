import { IndexConfig, IndexOptions, SearchContext, SearchOptions, SearchResult } from './types';

// Define core namespace
export namespace NexusSearch {
   

   
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

    // Event types
    export type SearchEventType =
        | 'search:start'
        | 'search:complete'
        | 'search:error'
        | 'index:start'
        | 'index:complete'
        | 'index:error'
        | 'storage:error';

    export interface SearchEvent {
        type: SearchEventType;
        timestamp: number;
        data?: any;
        error?: Error;
    }

    // Document types
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

    // Internal types
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
    export function isSearchOptions(obj: any): obj is SearchOptions {
        return obj && (
            typeof obj.fuzzy === 'undefined' || typeof obj.fuzzy === 'boolean'
        ) && (
            typeof obj.maxResults === 'undefined' || typeof obj.maxResults === 'number'
        );
    }

    export function isIndexConfig(obj: any): obj is IndexConfig {
        return obj &&
            typeof obj.name === 'string' &&
            typeof obj.version === 'number' &&
            Array.isArray(obj.fields);
    }

    export function isSearchResult<T>(obj: any): obj is SearchResult<T> {
        return obj &&
            'item' in obj &&
            typeof obj.score === 'number' &&
            Array.isArray(obj.matches);
    }
}

// Export core functionality
export { SearchEngine } from './core/SearchEngine';
export { IndexManager } from './core/IndexManager';
export { QueryProcessor } from './core/QueryProcessor';

// Export algorithm implementations 
export { TrieNode } from './algorithms/trie/TrieNode';
export { TrieSearch } from './algorithms/trie/TrieSearch';

// Export mappers
export { DataMapper } from './mappers/DataMapper';
export { IndexMapper } from './mappers/IndexMapper';

// Export storage utilities
export { CacheManager, IndexedDB } from './storage/index';

// Export utility functions
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

// Export core types
export type { SearchResult, SearchOptions, SearchContext, IndexConfig, IndexOptions };

// Set default export
export default NexusSearch;

// Backward compatibility export
export type { NexusSearch as Types };