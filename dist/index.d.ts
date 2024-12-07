import type { IndexConfig as IIndexConfig, IndexOptions as IIndexOptions, SearchContext as ISearchContext, SearchOptions as ISearchOptions, SearchResult as ISearchResult, SearchStats as ISearchStats } from './types';
export declare namespace NexusSearch {
    type IndexOptions = IIndexOptions;
    type SearchStats = ISearchStats;
    type SearchContext = ISearchContext;
    type SearchOptions = ISearchOptions;
    type SearchResult<T> = ISearchResult<T>;
    type IndexConfig = IIndexConfig;
    const DEFAULT_INDEX_OPTIONS: Required<IndexOptions>;
    const DEFAULT_SEARCH_OPTIONS: Required<SearchOptions>;
    class SearchError extends Error {
        constructor(message: string);
    }
    class IndexError extends Error {
        constructor(message: string);
    }
    type SearchEventType = 'search:start' | 'search:complete' | 'search:error' | 'index:start' | 'index:complete' | 'index:error' | 'storage:error';
    interface SearchEvent {
        type: SearchEventType;
        timestamp: number;
        data?: any;
        error?: Error;
    }
    interface DocumentLink {
        fromId: string;
        toId: string;
        weight: number;
    }
    interface DocumentRank {
        id: string;
        rank: number;
        incomingLinks: number;
        outgoingLinks: number;
    }
    interface InternalConfig extends IndexConfig {
        _id: string;
        _created: number;
        _updated: number;
    }
    interface QueryContext extends SearchContext {
        _processed: boolean;
        _cached: boolean;
    }
    function isSearchOptions(obj: any): obj is SearchOptions;
    function isIndexConfig(obj: any): obj is IndexConfig;
    function isSearchResult<T>(obj: any): obj is SearchResult<T>;
}
export { SearchEngine } from './core/SearchEngine';
export { IndexManager } from './core/IndexManager';
export { QueryProcessor } from './core/QueryProcessor';
export { TrieNode } from './algorithms/trie/TrieNode';
export { TrieSearch } from './algorithms/trie/TrieSearch';
export { DataMapper } from './mappers/DataMapper';
export { IndexMapper } from './mappers/IndexMapper';
export { CacheManager, IndexedDB } from './storage/index';
export { PerformanceMonitor, createSearchableFields, optimizeIndex, getNestedValue, normalizeFieldValue, validateSearchOptions, validateIndexConfig, validateDocument } from './utils';
export type { IIndexConfig as IndexConfig, IIndexOptions as IndexOptions, ISearchContext as SearchContext, ISearchOptions as SearchOptions, ISearchResult as SearchResult, ISearchStats as SearchStats };
export default NexusSearch;
