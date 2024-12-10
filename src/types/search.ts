import { DocumentMetadata } from './utils';

export interface SearchResult<T = unknown> {
    item: T;
    score: number;
    matches: string[];
    highlights?: Record<string, string[]>;
}

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

export interface SearchableDocument {
    id: string;
    content: Record<string, string | string[] | number | boolean>;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}

export interface SearchableField {
    value: DocumentValue;
    weight?: number;
    metadata?: DocumentMetadata;
}
export type DocumentValue = string | number | boolean | string[] | Record<string, unknown>;

export interface SearchNode {
    id?: string;
    score: number;
    children: Map<string, SearchNode>;
}

