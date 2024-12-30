import { IndexedDocument } from "@/storage";
import { IndexNode, OptimizationResult, SearchableDocument, DocumentContent, DocumentValue, RegexSearchResult, RegexSearchConfig } from "@/types";
/**
 * Performs an optimized Breadth-First Search traversal with regex matching
 */
export declare function bfsRegexTraversal(root: IndexNode, pattern: string | RegExp, maxResults?: number, config?: RegexSearchConfig): RegexSearchResult[];
/**
 * Performs an optimized Depth-First Search traversal with regex matching
 */
export declare function dfsRegexTraversal(root: IndexNode, pattern: string | RegExp, maxResults?: number, config?: RegexSearchConfig): RegexSearchResult[];
/**
 * Creates searchable fields from a document based on specified field paths
 */
export declare function createSearchableFields(document: SearchableDocument, fields: string[]): Record<string, string>;
/**
 * Normalizes field values into searchable strings
 */
export declare function normalizeFieldValue(value: DocumentValue): string;
/**
 * Retrieves a nested value from an object using dot notation path
 */
export declare function getNestedValue(obj: DocumentContent, path: string): DocumentValue | undefined;
/**
 * Optimizes an array of indexable documents
 */
export declare function optimizeIndex<T extends IndexedDocument>(data: T[]): OptimizationResult<T>;
/**
 * Helper function to sort object keys recursively
 */
export declare function sortObjectKeys<T extends object>(obj: T): T;
/**
 * Helper function to generate consistent sort keys for documents
 */
export declare function generateSortKey(doc: IndexedDocument): string;
