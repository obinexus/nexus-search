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
    options: SearchOptions$1;
    startTime: number;
    results: SearchResult$1<any>[];
    stats: SearchStats;
}
interface TokenInfo {
    value: string;
    type: 'word' | 'operator' | 'modifier' | 'delimiter';
    position: number;
    length: number;
}
declare function isSearchOptions(obj: any): obj is SearchOptions$1;
declare function isIndexConfig(obj: any): obj is IndexConfig$1;
declare function isSearchResult<T>(obj: any): obj is SearchResult$1<T>;
declare function createSearchStats(): SearchStats;
declare function createSearchContext(query: string, options?: SearchOptions$1): SearchContext;
declare function createTokenInfo(value: string, type: TokenInfo['type'], position: number): TokenInfo;
declare const DEFAULT_INDEX_OPTIONS: Required<IndexOptions$1>;
declare const DEFAULT_SEARCH_OPTIONS: Required<SearchOptions$1>;
declare namespace NexusSearch {
    interface InternalConfig extends IndexConfig$1 {
        _id: string;
        _created: number;
        _updated: number;
    }
    interface QueryContext extends SearchContext {
        _processed: boolean;
        _cached: boolean;
    }
}
interface SearchOptions$1 {
    fuzzy?: boolean;
    maxResults?: number;
    threshold?: number;
    fields?: string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
}
interface SearchResult$1<T> {
    item: T;
    score: number;
    matches: string[];
    highlights?: Record<string, string[]>;
}
interface IndexConfig$1 {
    name: string;
    version: number;
    fields: string[];
    options?: IndexOptions$1;
}
interface IndexOptions$1 {
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

declare class SearchEngine {
    private indexManager;
    private queryProcessor;
    private storage;
    private cache;
    private config;
    constructor(config: IndexConfig$1);
    initialize(): Promise<void>;
    addDocuments<T>(documents: T[]): Promise<void>;
    search<T>(query: string, options?: SearchOptions$1): Promise<SearchResult$1<T>[]>;
    private loadIndexes;
    private generateCacheKey;
    clearIndex(): Promise<void>;
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

declare class IndexManager {
    private indexMapper;
    private config;
    private documents;
    constructor(config: IndexConfig);
    addDocuments<T>(documents: T[]): Promise<void>;
    search<T>(query: string, options: SearchOptions): Promise<SearchResult<T>[]>;
    exportIndex(): any;
    importIndex(data: any): void;
    clear(): void;
    private generateDocumentId;
}

declare class QueryProcessor {
    private readonly STOP_WORDS;
    process(query: string): string;
    private tokenize;
    private classifyToken;
    private processTokens;
    private normalizeToken;
    private optimizeQuery;
}

declare function createSearchableFields<T>(document: T, fields: string[]): Record<string, string>;
declare function optimizeIndex(data: any[]): any[];

declare function validateSearchOptions(options: SearchOptions): void;
declare function validateIndexConfig(config: IndexConfig): void;
declare function validateDocument(document: any, fields: string[]): boolean;

export { DEFAULT_INDEX_OPTIONS, DEFAULT_SEARCH_OPTIONS, type IndexConfig$1 as IndexConfig, IndexError, IndexManager, type IndexNode, type IndexOptions$1 as IndexOptions, NexusSearch, QueryProcessor, type SearchContext, SearchEngine, SearchError, type SearchEvent, type SearchEventListener, type SearchEventType, type SearchOptions$1 as SearchOptions, type SearchResult$1 as SearchResult, type SearchStats, StorageError, type TokenInfo, ValidationError, createSearchContext, createSearchStats, createSearchableFields, createTokenInfo, isIndexConfig, isSearchOptions, isSearchResult, optimizeIndex, validateDocument, validateIndexConfig, validateSearchOptions };
