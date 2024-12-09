import { DBSchema } from 'idb';

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

type PrimitiveValue = string | number | boolean | null;
type ArrayValue = PrimitiveValue[];
type ComplexValue = Record<string, PrimitiveValue | ArrayValue>;
type DocumentValue = PrimitiveValue | ArrayValue | ComplexValue;
type DocumentMetadata = Record<string, DocumentValue>;
interface IndexableDocument {
    id: string;
    content: Record<string, DocumentValue>;
    metadata?: DocumentMetadata;
}
declare function createSearchStats(): SearchStats;
declare function createSearchContext(query: string, options?: SearchOptions): SearchContext;
declare function createTokenInfo(value: string, type: TokenInfo['type'], position: number): TokenInfo;

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

interface StorageEntry<T> {
    id: string;
    data: T;
    timestamp: number;
}
interface StorageOptions {
    maxSize?: number;
    ttl?: number;
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

export { type ArrayValue, type CacheEntry, type CacheOptions, type ComplexValue, type DatabaseConfig, type DocumentData, type DocumentLink, type DocumentMetadata, type DocumentRank, type DocumentScore, type DocumentValue, type IndexConfig, IndexError, type IndexNode, type IndexOptions, type IndexableDocument, type IndexedDocument, type MapperOptions, type MapperState, type MetadataEntry, type MetricsResult, type OptimizationOptions, type OptimizationResult, type PerformanceMetric, type PrimitiveValue, type QueryToken, type ScoringMetrics, type SearchContext, type SearchDBSchema, SearchError, type SearchEvent, type SearchEventListener, type SearchEventType, type SearchNode, type SearchOptions, type SearchResult, type SearchStats, type SearchableDocument, type SearchableField, type SerializedState, type SerializedTrieNode, type StorageEntry, StorageError, type StorageOptions, type TextScore, type TokenInfo, ValidationError, createSearchContext, createSearchStats, createTokenInfo };
