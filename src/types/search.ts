import { DocumentMetadata, DocumentValue } from './utils';

// Core search result types
export interface SearchResult {
    item: unknown;
    score: number;
    matches: string[];
    highlights?: Record<string, string[]>;
}

export interface DetailedSearchResult<T> extends Omit<SearchResult, 'item'> {
    item: T;
}

// Field types
export interface SearchableField {
    value: DocumentValue;
    weight?: number;
    metadata?: DocumentMetadata;
}

export interface NormalizedField {
    original: DocumentValue;
    normalized: string;
    weight: number;
}

// Search configuration
export interface SearchOptions {
    fuzzy?: boolean;
    maxResults?: number;
    threshold?: number;
    fields?: string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
}

// Search context and state
export interface SearchContext {
    query: string;
    options: SearchOptions;
    startTime: number;
    results: SearchResult[];
    stats: SearchStats;
}

export interface SearchStats {
    totalResults: number;
    searchTime: number;
    indexSize: number;
    queryComplexity: number;
}

// Document and node types
export interface SearchableDocument {
    id: string;
    content: Record<string, string | string[] | number | boolean>;
    metadata?: Record<string, unknown>;
}

export interface SearchNode {
    id?: string;
    score: number;
    children: Map<string, SearchNode>;
}