import { DocumentValue, IndexableDocument, OptimizationResult, SearchableDocument } from "@/types";
type DocumentContent = {
    [key: string]: DocumentValue | DocumentContent;
};
/**
 * Creates searchable fields from a document based on specified field paths.
 * Handles nested paths and various value types.
 */
export declare function createSearchableFields(document: SearchableDocument, fields: string[]): Record<string, string>;
/**
 * Normalizes field values into searchable strings.
 * Handles various data types and nested structures.
 */
export declare function normalizeFieldValue(value: DocumentValue): string;
/**
 * Retrieves a nested value from an object using dot notation path.
 * Handles arrays and nested objects safely.
 */
export declare function getNestedValue(obj: DocumentContent, path: string): DocumentValue | undefined;
/**
 * Optimizes an array of indexable documents by removing duplicates
 * and sorting them efficiently.
 *
 * @template T - The type of the indexable document.
 * @param {T[]} data - Array of indexable documents to optimize.
 * @returns {OptimizationResult<T>} Optimized data and optimization statistics.
 */
export declare function optimizeIndex<T extends IndexableDocument>(data: T[]): OptimizationResult<T>;
export {};
