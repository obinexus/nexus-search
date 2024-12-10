import { DBSchema } from 'idb';
import { SearchEngineConfig as SearchEngineConfig$1, IndexedDocument as IndexedDocument$1, SearchOptions as SearchOptions$1, SearchResult as SearchResult$1, IndexConfig as IndexConfig$1, SerializedState as SerializedState$1, SearchableDocument as SearchableDocument$1, MetadataEntry as MetadataEntry$1, IndexableDocument as IndexableDocument$1, DocumentValue as DocumentValue$2, OptimizationResult as OptimizationResult$1, MetricsResult as MetricsResult$1 } from '@/types';
import { SerializedIndex as SerializedIndex$1 } from '@/types/core';

interface IndexOptions {
    caseSensitive?: boolean;
    stemming?: boolean;
    stopWords?: string[];
    minWordLength?: number;
    maxWordLength?: number;
    fuzzyThreshold?: number;
}
interface IndexConfig {
    name: string;
    version: number;
    fields: string[];
    options?: IndexOptions;
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
interface DocumentData {
    content: string;
    metadata: Record<string, unknown>;
    [key: string]: unknown;
}
interface IndexedDocument {
    id: string;
    fields: Record<string, string>;
    metadata?: Record<string, unknown>;
}
type PrimitiveValue$1 = string | number | boolean | null;
type ArrayValue$1 = PrimitiveValue$1[];
type ComplexValue$1 = Record<string, PrimitiveValue$1 | ArrayValue$1>;
type DocumentValue$1 = PrimitiveValue$1 | ArrayValue$1 | ComplexValue$1;
type DocumentMetadata$1 = Record<string, DocumentValue$1>;
interface IndexableDocument {
    id: string;
    content: Record<string, DocumentValue$1>;
    metadata?: DocumentMetadata$1;
}

interface StorageEntry<T> {
    id: string;
    data: T;
    timestamp: number;
}
interface StorageOptions {
    type: string;
    maxSize?: number;
    ttl?: number;
}

interface SearchEngineConfig extends IndexConfig {
    storage?: StorageOptions;
}
interface IndexNode {
    id: string;
    value: unknown;
    score: number;
    children: Map<string, IndexNode>;
}
interface TokenInfo {
    value: string;
    type: 'word' | 'operator' | 'modifier' | 'delimiter';
    position: number;
    length: number;
}
interface SerializedIndex {
    documents: Array<{
        key: string;
        value: IndexedDocument;
    }>;
    indexState: unknown;
    config: IndexConfig;
}

type PrimitiveValue = string | number | boolean | null;
type ArrayValue = PrimitiveValue[];
type ComplexValue = Record<string, PrimitiveValue | ArrayValue>;
type DocumentValue = PrimitiveValue | ArrayValue | ComplexValue;
type DocumentMetadata = Record<string, DocumentValue>;

interface SearchResult<T = unknown> {
    item: T;
    score: number;
    matches: string[];
    highlights?: Record<string, string[]>;
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
interface SearchContext {
    query: string;
    options: SearchOptions;
    startTime: number;
    results: SearchResult[];
    stats: SearchStats;
}
interface SearchStats {
    totalResults: number;
    searchTime: number;
    indexSize: number;
    queryComplexity: number;
}
interface SearchableDocument {
    id: string;
    content: Record<string, string | string[] | number | boolean>;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}
interface SearchableField {
    value: DocumentValue;
    weight?: number;
    metadata?: DocumentMetadata;
}
interface SearchNode {
    id?: string;
    score: number;
    children: Map<string, SearchNode>;
}

interface SearchDBSchema extends DBSchema {
    searchIndices: {
        key: string;
        value: {
            id: string;
            data: unknown;
            timestamp: number;
        };
        indexes: {
            'timestamp': number;
        };
    };
    metadata: {
        key: string;
        value: MetadataEntry;
        indexes: {
            'lastUpdated': number;
        };
    };
}
interface MetadataEntry {
    id: string;
    config: IndexConfig;
    lastUpdated: number;
}
interface DatabaseConfig {
    name: string;
    version: number;
    stores: Array<{
        name: string;
        keyPath: string;
        indexes: Array<{
            name: string;
            keyPath: string;
            options?: IDBIndexParameters;
        }>;
    }>;
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
    data?: unknown;
    error?: Error;
}
interface SearchEventListener {
    (event: SearchEvent): void;
}

interface MapperState {
    trie: unknown;
    dataMap: Record<string, string[]>;
    documents: Array<{
        key: string;
        value: IndexedDocument;
    }>;
    config: IndexConfig;
}
interface MapperOptions {
    caseSensitive?: boolean;
    normalization?: boolean;
}

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}
interface CacheOptions {
    maxSize: number;
    ttlMinutes: number;
}

interface DocumentScore {
    textScore: number;
    documentRank: number;
    termFrequency: number;
    inverseDocFreq: number;
}
interface TextScore {
    termFrequency: number;
    documentFrequency: number;
    score: number;
}
interface TextScore {
    termFrequency: number;
    documentFrequency: number;
    score: number;
}
interface ScoringMetrics {
    textScore: number;
    documentRank: number;
    termFrequency: number;
    inverseDocFreq: number;
}

interface PerformanceMetrics {
    avg: number;
    min: number;
    max: number;
    count: number;
}
interface PerformanceData {
    [key: string]: PerformanceMetrics;
}
interface PerformanceMetric {
    avg: number;
    min: number;
    max: number;
    count: number;
}
interface MetricsResult {
    [key: string]: PerformanceMetric;
}

interface OptimizationOptions {
    deduplication?: boolean;
    sorting?: boolean;
    compression?: boolean;
}
interface OptimizationResult<T> {
    data: T[];
    stats: {
        originalSize: number;
        optimizedSize: number;
        compressionRatio?: number;
    };
}

interface SerializedTrieNode {
    isEndOfWord: boolean;
    documentRefs: string[];
    children: {
        [key: string]: SerializedTrieNode;
    };
}
interface SerializedState {
    trie: SerializedTrieNode;
    documents: [string, IndexableDocument][];
    documentLinks: [string, DocumentLink[]][];
}

type QueryToken = {
    type: 'term' | 'operator' | 'modifier';
    value: string;
};

interface TrieSearchOptions {
    caseSensitive?: boolean;
    fuzzy?: boolean;
    maxDistance?: number;
}

declare class SearchEngine {
    private indexManager;
    private queryProcessor;
    private storage;
    private cache;
    private config;
    private isInitialized;
    constructor(config: SearchEngineConfig$1);
    initialize(): Promise<void>;
    addDocuments<T extends IndexedDocument$1>(documents: T[]): Promise<void>;
    search<T extends IndexedDocument$1>(query: string, options?: SearchOptions$1): Promise<SearchResult$1<T>[]>;
    private loadIndexes;
    private generateCacheKey;
    clearIndex(): Promise<void>;
    close(): Promise<void>;
}

declare class IndexManager {
    private indexMapper;
    private config;
    private documents;
    constructor(config: IndexConfig$1);
    addDocuments<T extends IndexedDocument$1>(documents: T[]): Promise<void>;
    search<T extends IndexedDocument$1>(query: string, options: SearchOptions$1): Promise<SearchResult$1<T>[]>;
    exportIndex(): SerializedIndex$1;
    importIndex(data: unknown): void;
    clear(): void;
    private generateDocumentId;
    private isValidIndexData;
    private serializeDocument;
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
    documentRefs: Set<string>;
    weight: number;
    constructor();
}

declare class TrieSearch {
    private root;
    private documents;
    private documentLinks;
    constructor();
    exportState(): SerializedState$1;
    importState(state: SerializedState$1): void;
    insert(word: string, documentId: string): void;
    search(prefix: string, maxResults?: number): Set<string>;
    fuzzySearch(word: string, maxDistance?: number): Set<string>;
    private collectDocumentRefs;
    private fuzzySearchHelper;
    private calculateLevenshteinDistance;
    /**
     * Serializes a TrieNode for persistence
     */
    private serializeNode;
    /**
     * Deserializes a node from its serialized form
     */
    private deserializeNode;
    /**
     * Clears all data from the trie
     */
    clear(): void;
    /**
     * Gets the current size of the trie
     */
    getSize(): number;
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
    indexDocument(document: SearchableDocument$1, id: string, fields: string[]): void;
    search(query: string, options?: {
        fuzzy?: boolean;
        maxResults?: number;
    }): SearchResult$1<string>[];
    exportState(): unknown;
    importState(state: {
        trie: SerializedState$1;
        dataMap: Record<string, string[]>;
    }): void;
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
    getMetadata(): Promise<MetadataEntry$1 | null>;
    clearIndices(): Promise<void>;
    deleteIndex(key: string): Promise<void>;
    close(): Promise<void>;
}

type DocumentContent = {
    [key: string]: DocumentValue$2 | DocumentContent;
};
declare function createSearchableFields<T extends IndexableDocument$1>(document: T, fields: string[]): Record<string, string>;
declare function normalizeFieldValue(value: DocumentValue$2): string;
declare function getNestedValue(obj: DocumentContent, path: string): DocumentValue$2 | undefined;
declare function optimizeIndex<T extends IndexableDocument$1>(data: T[]): OptimizationResult$1<T>;

declare class PerformanceMonitor {
    private metrics;
    constructor();
    measure<T>(name: string, fn: () => Promise<T>): Promise<T>;
    private recordMetric;
    getMetrics(): MetricsResult$1;
    private average;
    clear(): void;
}

declare function validateSearchOptions(options: SearchOptions$1): void;
declare function validateIndexConfig(config: IndexConfig$1): void;
declare function validateDocument(document: SearchableDocument$1, fields: string[]): boolean;

declare const DEFAULT_INDEX_OPTIONS: Required<IndexOptions>;
declare const DEFAULT_SEARCH_OPTIONS: Required<SearchOptions>;
declare class SearchError extends Error {
    constructor(message: string);
}
declare class IndexError extends Error {
    constructor(message: string);
}
declare function isSearchOptions(obj: unknown): obj is SearchOptions;
declare function isIndexConfig(obj: unknown): obj is IndexConfig;
declare function isSearchResult<T>(obj: unknown): obj is SearchResult<T>;

declare const NexusSearch: {
    readonly DEFAULT_INDEX_OPTIONS: Required<IndexOptions>;
    readonly DEFAULT_SEARCH_OPTIONS: Required<SearchOptions>;
    readonly SearchError: typeof SearchError;
    readonly IndexError: typeof IndexError;
    readonly SearchEngine: typeof SearchEngine;
    readonly IndexManager: typeof IndexManager;
    readonly QueryProcessor: typeof QueryProcessor;
    readonly TrieNode: typeof TrieNode;
    readonly TrieSearch: typeof TrieSearch;
    readonly isSearchOptions: typeof isSearchOptions;
    readonly isIndexConfig: typeof isIndexConfig;
    readonly isSearchResult: typeof isSearchResult;
};

export { type ArrayValue$1 as ArrayValue, type CacheEntry, CacheManager, type CacheOptions, type ComplexValue$1 as ComplexValue, DEFAULT_INDEX_OPTIONS, DEFAULT_SEARCH_OPTIONS, DataMapper, type DatabaseConfig, type DocumentData, type DocumentLink, type DocumentMetadata$1 as DocumentMetadata, type DocumentRank, type DocumentScore, type DocumentValue$1 as DocumentValue, type IndexConfig, IndexError, IndexManager, IndexMapper, type IndexNode, type IndexOptions, type IndexableDocument, IndexedDB, type IndexedDocument, type MapperOptions, type MapperState, type MetadataEntry, type MetricsResult, NexusSearch, type OptimizationOptions, type OptimizationResult, type PerformanceData, type PerformanceMetric, type PerformanceMetrics, PerformanceMonitor, type PrimitiveValue$1 as PrimitiveValue, QueryProcessor, type QueryToken, type ScoringMetrics, type SearchContext, type SearchDBSchema, SearchEngine, type SearchEngineConfig, SearchError, type SearchEvent, type SearchEventListener, type SearchEventType, type SearchNode, type SearchOptions, type SearchResult, type SearchStats, type SearchableDocument, type SearchableField, type SerializedIndex, type SerializedState, type SerializedTrieNode, type StorageEntry, StorageError, type StorageOptions, type TextScore, type TokenInfo, TrieNode, TrieSearch, type TrieSearchOptions, ValidationError, createSearchableFields, NexusSearch as default, getNestedValue, isIndexConfig, isSearchOptions, isSearchResult, normalizeFieldValue, optimizeIndex, validateDocument, validateIndexConfig, validateSearchOptions };
