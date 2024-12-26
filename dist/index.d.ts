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

interface DocumentMetadata {
    [key: string]: any;
}
type DocumentValue = any;
interface DocumentLink {
    fromId(fromId: any): unknown;
    toId(toId: any): unknown;
    source: string;
    target: string;
}
interface IndexableDocumentFields {
    title: string;
    content: string;
    author: string;
    tags: string[];
    version: string;
    modified?: string;
    [key: string]: string | string[] | number | boolean | null | undefined;
}
type PrimitiveValue = string | number | boolean | null;
type ArrayValue = PrimitiveValue[];
type ComplexValue = Record<string, PrimitiveValue | ArrayValue>;
interface DocumentRank {
    id: string;
    rank: number;
    incomingLinks: number;
    outgoingLinks: number;
    content: Record<string, any>;
    metadata?: DocumentMetadata;
}
interface DocumentData {
    [key: string]: any;
    metadata?: DocumentMetadata;
}
type DocumentContent = {
    [key: string]: DocumentValue | DocumentContent;
};
interface IndexedDocument {
    id: string;
    fields: IndexableDocumentFields;
    metadata?: DocumentMetadata;
    versions: Array<{
        version: number;
        content: string;
        modified: Date;
        author: string;
    }>;
    relations: Array<{
        type: string;
        targetId: string;
    }>;
    content: DocumentData;
    toObject(): IndexedDocument;
    document(): IndexedDocument;
    clone(): IndexedDocument;
    update(updates: Partial<IndexedDocument>): IndexedDocument;
}
/**
 * Configuration for document operations
 */
interface DocumentConfig {
    fields?: string[];
    storage?: {
        type: 'memory' | 'indexeddb';
        options?: Record<string, any>;
    };
    versioning?: {
        enabled: boolean;
        maxVersions?: number;
    };
    validation?: {
        required?: string[];
        customValidators?: Record<string, (value: any) => boolean>;
    };
}

interface SearchResult<T = unknown> {
    id: string;
    document: IndexedDocument;
    item: T;
    score: number;
    matches: string[];
    metadata?: DocumentMetadata;
}
interface SearchOptions {
    fuzzy?: boolean;
    fields?: string[];
    boost?: Record<string, number>;
    maxResults?: number;
    threshold?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
    regex?: RegExp | string;
    highlight?: boolean;
    includeMatches?: boolean;
    includeScore?: boolean;
    includeStats?: boolean;
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
    content: Record<string, DocumentValue>;
    metadata?: DocumentMetadata;
    [key: string]: any;
}
interface SearchableField {
    value: DocumentValue;
    weight?: number;
    metadata?: DocumentMetadata;
}
interface SearchNode {
    id?: string;
    score: number;
    value?: DocumentValue;
    children: Map<string, SearchNode>;
    metadata?: DocumentMetadata;
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

type SearchEventType = 'engine:initialized' | 'engine:closed' | 'index:start' | 'index:complete' | 'index:error' | 'index:clear' | 'index:clear:error' | 'search:start' | 'search:complete' | 'search:error' | 'update:start' | 'update:complete' | 'update:error' | 'remove:start' | 'remove:complete' | 'remove:error' | 'bulk:update:start' | 'bulk:update:complete' | 'bulk:update:error' | 'import:start' | 'import:complete' | 'import:error' | 'export:start' | 'export:complete' | 'export:error' | 'optimize:start' | 'optimize:complete' | 'optimize:error' | 'reindex:start' | 'reindex:complete' | 'reindex:error' | 'storage:error' | 'storage:clear' | 'storage:clear:error';
interface BaseEvent {
    timestamp: number;
    region?: string;
}
interface SuccessEvent extends BaseEvent {
    data?: {
        documentCount?: number;
        searchTime?: number;
        resultCount?: number;
        documentId?: string;
        updateCount?: number;
        query?: string;
        options?: unknown;
    };
}
interface ErrorEvent extends BaseEvent {
    error: Error;
    details?: {
        documentId?: string;
        operation?: string;
        phase?: string;
    };
}
interface SearchEvent extends BaseEvent {
    type: SearchEventType;
    data?: unknown;
    error?: Error;
    regex?: RegExp;
}
interface SearchEventListener {
    (event: SearchEvent): void;
}
interface SearchEventEmitter {
    addEventListener(listener: SearchEventListener): void;
    removeEventListener(listener: SearchEventListener): void;
    emitEvent(event: SearchEvent): void;
}
declare class SearchEventError extends Error {
    readonly type: SearchEventType;
    readonly details?: unknown | undefined;
    constructor(message: string, type: SearchEventType, details?: unknown | undefined);
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
    strategy: CacheStrategyType;
    maxSize: number;
    ttlMinutes: number;
}
declare enum CacheStrategyType {
    LRU = "LRU",
    MRU = "MRU"
}
type CacheStrategy = keyof typeof CacheStrategyType;
interface CacheStatus {
    size: number;
    maxSize: number;
    strategy: CacheStrategy;
    ttl: number;
    utilization: number;
    oldestEntryAge: number | null;
    newestEntryAge: number | null;
    memoryUsage: {
        bytes: number;
        formatted: string;
    };
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
    weight: number;
    children: {
        [key: string]: SerializedTrieNode;
    };
}
interface SerializedState {
    trie: SerializedTrieNode;
    documents: [string, IndexedDocument][];
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

/**
 * Version information for document versioning system
 */
interface DocumentVersion {
    /** Document version number */
    version: number;
    /** Content at this version */
    content: string;
    /** Modification timestamp */
    modified: Date;
    /** Author who made the changes */
    author: string;
    /** Optional changelog message */
    changelog?: string;
}
/**
 * Relationship definition between documents
 */
interface DocumentRelation {
    /** Source document ID */
    sourceId: string;
    /** Target document ID */
    targetId: string;
    /** Type of relationship */
    type: 'reference' | 'parent' | 'child' | 'related';
    /** Optional metadata for the relationship */
    metadata?: Record<string, any>;
}
/**
 * Workflow status information
 */
interface DocumentWorkflow {
    /** Current workflow status */
    status: string;
    /** Optional assignee for the document */
    assignee?: string;
    /** Optional due date */
    dueDate?: string;
}
/**
 * Extended metadata for Nexus documents
 */
interface NexusDocumentMetadata extends DocumentMetadata {
    /** Timestamp when document was indexed */
    indexed: number;
    /** Last modification timestamp */
    lastModified: number;
    /** Optional document checksum */
    checksum?: string;
    /** Optional access permissions */
    permissions?: string[];
    /** Optional workflow information */
    workflow?: DocumentWorkflow;
}
/**
 * Fields specific to Nexus documents
 */
interface NexusDocumentFields extends IndexableDocumentFields {
    /** Document title */
    title: string;
    /** Document content */
    content: string;
    /** Document type */
    type: string;
    /** Associated tags */
    tags: string[];
    /** Optional category */
    category?: string | string[];
    /** Document author */
    author: string;
    /** Creation timestamp (ISO string) */
    created: string;
    /** Modification timestamp (ISO string) */
    modified: string;
    /** Document status */
    status: 'draft' | 'published' | 'archived';
    /** Version identifier */
    version: string;
    /** Optional locale */
    locale?: string;
    /** Allow additional string fields */
    [key: string]: string | string[] | undefined;
}
/**
 * Nexus document interface extending base indexed document
 */
interface NexusDocument extends IndexedDocument {
    /** Document fields */
    fields: NexusDocumentFields;
    /** Document versions */
    versions: DocumentVersion[];
    /** Document relationships */
    relations: DocumentRelation[];
    /** Extended metadata */
    metadata: NexusDocumentMetadata;
    /** Clone the document */
    clone(): this;
    /** Update document fields */
    update(updates: Partial<IndexedDocument>): IndexedDocument;
    /** Convert to plain object */
    toObject(): this;
}
/**
 * Configuration options for Nexus document plugin
 */
interface NexusDocumentPluginConfig {
    /** Plugin instance name */
    name?: string;
    /** Plugin version */
    version?: number;
    /** Searchable document fields */
    fields?: string[];
    /** Storage configuration */
    storage?: {
        /** Storage type */
        type: 'memory' | 'indexeddb';
        /** Optional storage options */
        options?: Record<string, any>;
    };
    /** Version control settings */
    versioning?: {
        /** Whether versioning is enabled */
        enabled: boolean;
        /** Maximum number of versions to keep */
        maxVersions?: number;
    };
    /** Document validation rules */
    validation?: {
        /** Required field names */
        required?: string[];
        /** Custom validation functions */
        customValidators?: Record<string, (value: any) => boolean>;
    };
}
/**
 * Parameters for creating new documents
 */
interface CreateDocumentOptions {
    /** Document title */
    title: string;
    /** Document content */
    content: string;
    /** Document type */
    type: string;
    /** Optional tags */
    tags?: string[];
    /** Optional category */
    category?: string;
    /** Document author */
    author: string;
    /** Optional status */
    status?: 'draft' | 'published' | 'archived';
    /** Optional locale */
    locale?: string;
    /** Optional metadata */
    metadata?: Partial<NexusDocumentMetadata>;
}
/**
 * Enhanced search options for documents
 */
interface AdvancedSearchOptions extends SearchOptions {
    /** Filter criteria */
    filters?: {
        /** Filter by status */
        status?: ('draft' | 'published' | 'archived')[];
        /** Filter by date range */
        dateRange?: {
            /** Start date */
            start: Date;
            /** End date */
            end: Date;
        };
        /** Filter by categories */
        categories?: string[];
        /** Filter by types */
        types?: string[];
        /** Filter by authors */
        authors?: string[];
    };
    /** Sort configuration */
    sort?: {
        /** Field to sort by */
        field: keyof NexusDocumentFields;
        /** Sort order */
        order: 'asc' | 'desc';
    };
}

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
    readonly DEFAULT_INDEX_OPTIONS: {
        fields: never[];
    };
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
    readonly DEFAULT_INDEX_OPTIONS: {
        fields: never[];
    };
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

export { type AdvancedSearchOptions, type ArrayValue, type BaseEvent, type CacheEntry, type CacheOptions, type CacheStatus, type CacheStrategy, CacheStrategyType, type ComplexValue, type CreateDocumentOptions, type DatabaseConfig, type DocumentConfig, type DocumentContent, type DocumentData, type DocumentLink, type DocumentMetadata, type DocumentRank, type DocumentRelation, type DocumentScore, type DocumentValue, type DocumentVersion, type DocumentWorkflow, type ErrorEvent, type IndexConfig, IndexError, type IndexNode, type IndexOptions, type IndexableDocumentFields, type IndexedDocument, type MapperOptions, type MapperState, type MetadataEntry, type MetricsResult, type NexusDocument, type NexusDocumentFields, type NexusDocumentMetadata, type NexusDocumentPluginConfig, NexusSearch, type OptimizationOptions, type OptimizationResult, type PerformanceData, type PerformanceMetric, type PerformanceMetrics, type PrimitiveValue, type QueryToken, type ScoringMetrics, type SearchContext, type SearchDBSchema, type SearchEngineConfig, SearchError, type SearchEvent, type SearchEventEmitter, SearchEventError, type SearchEventListener, type SearchEventType, type SearchNode, type SearchOptions, type SearchResult, type SearchStats, type SearchableDocument, type SearchableField, type SerializedIndex, type SerializedState, type SerializedTrieNode, type StorageEntry, StorageError, type StorageOptions, type SuccessEvent, type TextScore, type TokenInfo, type TrieSearchOptions, ValidationError, NexusSearch as default, isIndexConfig, isSearchOptions, isSearchResult };
