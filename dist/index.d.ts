import { DBSchema } from 'idb';
import { SearchEngine } from '@core/SearchEngine';
export { SearchEngine } from '@core/SearchEngine';
import { IndexManager } from '@storage/IndexManager';
export { IndexManager } from '@storage/IndexManager';
import { QueryProcessor } from '@core/QueryProcessor';
export { QueryProcessor } from '@core/QueryProcessor';
import { TrieNode } from '@algorithms/trie/TrieNode';
export { TrieNode } from '@algorithms/trie/TrieNode';
import { TrieSearch } from '@algorithms/trie/TrieSearch';
export { TrieSearch } from '@algorithms/trie/TrieSearch';
export { DataMapper } from '@/mappers/DataMapper';
export { IndexMapper } from '@/mappers/IndexMapper';
export { CacheManager } from '@storage/CacheManager';
export { IndexedDB } from '@storage/IndexedDBService';
export { PerformanceMonitor, createSearchableFields, getNestedValue, normalizeFieldValue, optimizeIndex, validateDocument, validateIndexConfig, validateSearchOptions } from '@utils/index';

type PrimitiveValue = string | number | boolean | null;
type ArrayValue = PrimitiveValue[];
type ComplexValue = Record<string, PrimitiveValue | ArrayValue>;
type DocumentValue = PrimitiveValue | ArrayValue | ComplexValue;
type DocumentMetadata = Record<string, DocumentValue>;
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
    metadata?: DocumentMetadata;
    [key: string]: unknown;
}
interface IndexedDocument {
    id: string;
    fields: Record<string, string>;
    metadata?: DocumentMetadata;
    [key: string]: DocumentValue | DocumentMetadata | undefined | string | Record<string, string>;
}
interface IndexableDocument {
    id: string;
    content: Record<string, DocumentValue>;
    metadata?: DocumentMetadata;
}

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

interface CacheEntry {
    data: SearchResult<unknown>[];
    timestamp: number;
    lastAccessed: number;
    accessCount: number;
}
interface CacheOptions {
    maxSize: number;
    ttlMinutes: number;
}
interface CacheOptions {
    strategy: CacheStrategy;
    maxSize: number;
    ttlMinutes: number;
}
declare enum CacheStrategyType {
    LRU = "LRU",
    MRU = "MRU"
}
type CacheStrategy = keyof typeof CacheStrategyType;
interface CacheStats {
    hits: number;
    misses: number;
    evictions: number;
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
    weight: number;
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

declare global {
    interface Window {
        NexusSearch: typeof NexusSearch;
    }
}

interface TrieSearchOptions {
    caseSensitive?: boolean;
    fuzzy?: boolean;
    maxDistance?: number;
}

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
declare global {
    interface Window {
        NexusSearch: typeof NexusSearchNamespace;
    }
}
declare const NexusSearchNamespace: {
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

export { type ArrayValue, type CacheEntry, type CacheOptions, type CacheStats, type CacheStrategy, CacheStrategyType, type ComplexValue, DEFAULT_INDEX_OPTIONS, DEFAULT_SEARCH_OPTIONS, type DatabaseConfig, type DocumentData, type DocumentLink, type DocumentMetadata, type DocumentRank, type DocumentScore, type DocumentValue, type IndexConfig, IndexError, type IndexNode, type IndexOptions, type IndexableDocument, type IndexedDocument, type MapperOptions, type MapperState, type MetadataEntry, type MetricsResult, NexusSearch, type OptimizationOptions, type OptimizationResult, type PerformanceData, type PerformanceMetric, type PerformanceMetrics, type PrimitiveValue, type QueryToken, type ScoringMetrics, type SearchContext, type SearchDBSchema, type SearchEngineConfig, SearchError, type SearchEvent, type SearchEventListener, type SearchEventType, type SearchNode, type SearchOptions, type SearchResult, type SearchStats, type SearchableDocument, type SearchableField, type SerializedIndex, type SerializedState, type SerializedTrieNode, type StorageEntry, StorageError, type StorageOptions, type TextScore, type TokenInfo, type TrieSearchOptions, ValidationError, NexusSearch as default, isIndexConfig, isSearchOptions, isSearchResult };
