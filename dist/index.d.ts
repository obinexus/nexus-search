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

declare class TrieNode {
    children: Map<string, TrieNode>;
    isEndOfWord: boolean;
    data: Set<string>;
    constructor();
}

interface SerializedTrieNode {
    isEndOfWord: boolean;
    data: string[];
    children: {
        [key: string]: SerializedTrieNode;
    };
}
declare class TrieSearch {
    private root;
    constructor();
    insert(word: string, documentId: string): void;
    search(prefix: string, maxResults?: number): Set<string>;
    exportState(): SerializedTrieNode;
    importState(state: SerializedTrieNode): void;
    private collectIds;
    fuzzySearch(word: string, maxDistance?: number): Set<string>;
    private fuzzySearchHelper;
    private levenshteinDistance;
    private serializeNode;
    private deserializeNode;
}

declare class DataMapper {
    private dataMap;
    constructor();
    mapData(key: string, documentId: string): void;
    getDocuments(key: string): Set<string>;
    getAllKeys(): string[];
    exportState(): Record<string, string[]>;
    importState(state: Record<string, string[]>): void;
    clear(): void;
}

declare class IndexMapper {
    private dataMapper;
    private trieSearch;
    constructor();
    indexDocument(document: any, id: string, fields: string[]): void;
    search(query: string, options?: {
        fuzzy?: boolean;
        maxResults?: number;
    }): SearchResult$1<string>[];
    exportState(): any;
    importState(state: any): void;
    private tokenizeText;
    private calculateScore;
    clear(): void;
}

declare class CacheManager {
    private cache;
    private readonly maxSize;
    private readonly ttl;
    constructor(maxSize?: number, ttlMinutes?: number);
    set(key: string, data: SearchResult$1<any>[]): void;
    get(key: string): SearchResult$1<any>[] | null;
    private isExpired;
    private evictOldest;
    clear(): void;
}

interface MetadataEntry {
    id: string;
    config: IndexConfig$1;
    lastUpdated: number;
}
declare class IndexedDB {
    private db;
    private readonly DB_NAME;
    private readonly DB_VERSION;
    private initPromise;
    constructor();
    initialize(): Promise<void>;
    private ensureConnection;
    storeIndex(key: string, data: any): Promise<void>;
    getIndex(key: string): Promise<any | null>;
    updateMetadata(config: IndexConfig$1): Promise<void>;
    getMetadata(): Promise<MetadataEntry | null>;
    clearIndices(): Promise<void>;
    deleteIndex(key: string): Promise<void>;
    close(): Promise<void>;
}

declare function createSearchableFields<T>(document: T, fields: string[]): Record<string, string>;
declare function normalizeFieldValue(value: any): string;
declare function getNestedValue(obj: any, path: string): any;
declare function optimizeIndex(data: any[]): any[];

declare class PerformanceMonitor {
    private metrics;
    constructor();
    measure<T>(name: string, fn: () => Promise<T>): Promise<T>;
    private recordMetric;
    getMetrics(): Record<string, {
        avg: number;
        min: number;
        max: number;
        count: number;
    }>;
    private average;
    clear(): void;
}

declare function validateSearchOptions(options: SearchOptions): void;
declare function validateIndexConfig(config: IndexConfig): void;
declare function validateDocument(document: any, fields: string[]): boolean;

export { CacheManager, DEFAULT_INDEX_OPTIONS, DEFAULT_SEARCH_OPTIONS, DataMapper, type IndexConfig$1 as IndexConfig, IndexError, IndexManager, IndexMapper, type IndexNode, type IndexOptions$1 as IndexOptions, IndexedDB, NexusSearch, PerformanceMonitor, QueryProcessor, type SearchContext, SearchEngine, SearchError, type SearchEvent, type SearchEventListener, type SearchEventType, type SearchOptions$1 as SearchOptions, type SearchResult$1 as SearchResult, type SearchStats, StorageError, type TokenInfo, TrieNode, TrieSearch, ValidationError, createSearchContext, createSearchStats, createSearchableFields, createTokenInfo, getNestedValue, isIndexConfig, isSearchOptions, isSearchResult, normalizeFieldValue, optimizeIndex, validateDocument, validateIndexConfig, validateSearchOptions };
