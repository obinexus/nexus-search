import { DocumentMetadata, DocumentValue } from './document';

// Core search result interface with proper generic typing
export interface SearchResult<T = unknown> {
    id: string;                   // Unique document identifier
    document: T;                  // Original document
    item: T;                      // Normalized document for display
    score: number;                // Relevance score
    matches: string[];            // Matched terms/phrases
    metadata?: DocumentMetadata;  // Optional metadata
}

// Search options with complete type safety
export interface SearchOptions {
    // Basic search options
    fuzzy?: boolean;              // Enable fuzzy matching
    fields?: string[];            // Fields to search in
    boost?: Record<string, number>; // Field weights
    maxResults?: number;          // Limit results
    threshold?: number;           // Score threshold

    // Sorting and pagination
    sortBy?: string;              // Sort field
    sortOrder?: 'asc' | 'desc';   // Sort direction
    page?: number;                // Page number
    pageSize?: number;            // Results per page

    // Advanced features
    regex?: RegExp | string;      // Regular expression pattern
    highlight?: boolean;          // Enable highlighting

    // Result customization
    includeMatches?: boolean;     // Include match details
    includeScore?: boolean;       // Include scores
    includeStats?: boolean;       // Include statistics
}

// Search context with runtime information
export interface SearchContext {
    query: string;                // Search query
    options: SearchOptions;       // Applied options
    startTime: number;            // Search start timestamp
    results: SearchResult[];      // Search results
    stats: SearchStats;           // Search statistics
}

// Search statistics interface
export interface SearchStats {
    totalResults: number;         // Total results found
    searchTime: number;           // Search duration in ms
    indexSize: number;            // Index size
    queryComplexity: number;      // Query complexity score
}

// Document interface for indexing
export interface SearchableDocument {
    id: string;                   // Document ID
    content: Record<string, DocumentValue>; // Document fields
    metadata?: DocumentMetadata;  // Document metadata
}

// Field interface for indexing
export interface SearchableField {
    value: DocumentValue;         // Field value
    weight?: number;              // Field weight
    metadata?: DocumentMetadata;  // Field metadata
}

// Search tree node interface
export interface SearchNode {
    id?: string;                  // Node ID
    score: number;                // Node score
    value?: DocumentValue;        // Node value
    children: Map<string, SearchNode>; // Child nodes
    metadata?: DocumentMetadata;  // Node metadata
}

// Additional helper types
export type SearchNodeMap = Map<string, SearchNode>;
export type SearchFieldMap = Map<string, SearchableField>;

// Validation helper type
export type ValidationResult = {
    isValid: boolean;
    errors?: string[];
};