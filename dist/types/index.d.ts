export declare namespace NexusSearch {
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
    interface SearchContext {
        query: string;
        options: SearchOptions;
        startTime: number;
        results: SearchResult<any>[];
        stats: SearchStats;
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
export default NexusSearch;
export type { NexusSearch as Types };
