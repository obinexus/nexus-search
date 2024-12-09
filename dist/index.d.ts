import { DBSchema as DBSchema$1 } from 'idb';

interface SearchResult<T> {
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
    results: SearchResult<unknown>[];
    stats: SearchStats;
}
interface SearchStats {
    totalResults: number;
    searchTime: number;
    indexSize: number;
    queryComplexity: number;
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

interface SearchDBSchema extends DBSchema$1 {
    searchIndices: {
        key: string;
        value: {
            id: string;
            data: any;
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
interface DBSchema {
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
interface SearchEvent {
    type: SearchEventType;
    timestamp: number;
    data?: any;
    error?: Error;
}
interface SearchEventListener {
    (event: SearchEvent): void;
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
interface TokenInfo {
    value: string;
    type: 'word' | 'operator' | 'modifier' | 'delimiter';
    position: number;
    length: number;
}

declare function createSearchStats(): SearchStats;
declare function createSearchContext(query: string, options?: SearchOptions): SearchContext;
declare function createTokenInfo(value: string, type: TokenInfo['type'], position: number): TokenInfo;

export { type DBSchema, type DocumentLink, type DocumentRank, type IndexConfig, IndexError, type IndexNode, type IndexOptions, type MetadataEntry, type SearchContext, type SearchDBSchema, SearchError, type SearchEvent, type SearchEventListener, type SearchEventType, type SearchOptions, type SearchResult, type SearchStats, StorageError, type TokenInfo, ValidationError, createSearchContext, createSearchStats, createTokenInfo };
