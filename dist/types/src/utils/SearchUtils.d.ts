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
/**
 * Helper function to sort object keys recursively for consistent serialization.
 */
export declare function sortObjectKeys<T extends object>(obj: T): T;
/**
 * Helper function to generate consistent sort keys for documents.
 */
export declare function generateSortKey(doc: IndexableDocument): string;
/**
 * Create a document that can be indexed
 * @param {Object} params Document parameters
 * @param {string} params.id Document ID
 * @param {Object} params.fields Document fields
 * @param {Object} [params.metadata] Optional metadata
 * @returns {Object} Indexed document
 */
export declare function createDocument({ id, fields, metadata }: {
    id: string;
    fields: Record<string, any>;
    metadata?: Record<string, any>;
}): {
    id: string;
    fields: Record<string, any>;
    metadata: {
        indexed: number;
        lastModified: number;
    };
};
export {};
