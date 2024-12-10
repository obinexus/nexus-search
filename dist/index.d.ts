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

interface TrieNode<T = unknown> {
    value: T;
    isEnd: boolean;
    children: Map<string, TrieNode<T>>;
}
interface TrieSearchOptions {
    caseSensitive?: boolean;
    fuzzy?: boolean;
    maxDistance?: number;
}

export { type ArrayValue$1 as ArrayValue, type CacheEntry, type CacheOptions, type ComplexValue$1 as ComplexValue, type DatabaseConfig, type DocumentData, type DocumentLink, type DocumentMetadata$1 as DocumentMetadata, type DocumentRank, type DocumentScore, type DocumentValue$1 as DocumentValue, type IndexConfig, IndexError, type IndexNode, type IndexOptions, type IndexableDocument, type IndexedDocument, type MapperOptions, type MapperState, type MetadataEntry, type MetricsResult, type OptimizationOptions, type OptimizationResult, type PerformanceData, type PerformanceMetric, type PerformanceMetrics, type PrimitiveValue$1 as PrimitiveValue, type QueryToken, type ScoringMetrics, type SearchContext, type SearchDBSchema, SearchError, type SearchEvent, type SearchEventListener, type SearchEventType, type SearchNode, type SearchOptions, type SearchResult, type SearchStats, type SearchableDocument, type SearchableField, type SerializedIndex, type SerializedState, type SerializedTrieNode, type StorageEntry, StorageError, type StorageOptions, type TextScore, type TokenInfo, type TrieNode, type TrieSearchOptions, ValidationError };
