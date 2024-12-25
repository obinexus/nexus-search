// search.ts
import { DocumentMetadata, DocumentValue, IndexedDocument } from './document';

// Core search result interface with proper generic typing
export interface SearchResult<T = unknown> {
    id: string;
    document: IndexedDocument;
    item: T;
    score: number;
    matches: string[];
    metadata?: DocumentMetadata;
}

// Search options with complete type safety
export interface SearchOptions {
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

// Search context with runtime information
export interface SearchContext {
    query: string;
    options: SearchOptions;
    startTime: number;
    results: SearchResult[];
    stats: SearchStats;
}

// Search statistics interface
export interface SearchStats {
    totalResults: number;
    searchTime: number;
    indexSize: number;
    queryComplexity: number;
}

// Document fields interface
export interface IndexableDocumentFields {
    [key: string]: string | string[] | number | boolean | null;
}

// Document interface for indexing
export interface SearchableDocument {
    id: string;
    content: Record<string, DocumentValue>;
    metadata?: DocumentMetadata;
}

// Field interface for indexing
export interface SearchableField {
    value: DocumentValue;
    weight?: number;
    metadata?: DocumentMetadata;
}

// Search tree node interface
export interface SearchNode {
    id?: string;
    score: number;
    value?: DocumentValue;
    children: Map<string, SearchNode>;
    metadata?: DocumentMetadata;
}
