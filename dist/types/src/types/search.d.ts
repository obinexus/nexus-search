import { DocumentMetadata, DocumentValue, IndexedDocument } from './document';
export interface SearchResult<T = unknown> {
    id: string;
    document: IndexedDocument;
    item: T;
    score: number;
    matches: string[];
    metadata?: DocumentMetadata;
}
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
    content: Record<string, DocumentValue>;
    metadata?: DocumentMetadata;
    [key: string]: any;
}
export interface SearchableField {
    value: DocumentValue;
    weight?: number;
    metadata?: DocumentMetadata;
}
export interface SearchNode {
    id?: string;
    score: number;
    value?: DocumentValue;
    children: Map<string, SearchNode>;
    metadata?: DocumentMetadata;
}
