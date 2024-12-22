import { DocumentValue, IndexableDocument, OptimizationResult } from "@/types";
type DocumentContent = {
    [key: string]: DocumentValue | DocumentContent;
};
export declare function createSearchableFields<T extends IndexableDocument>(document: T, fields: string[]): Record<string, string>;
export declare function normalizeFieldValue(value: DocumentValue): string;
export declare function getNestedValue(obj: DocumentContent, path: string): DocumentValue | undefined;
/**
 * Optimizes an array of indexable documents by removing duplicates and sorting them.
 *
 * @template T - The type of the indexable document.
 * @param {T[]} data - The array of indexable documents to be optimized.
 * @returns {OptimizationResult<T>} An object containing the optimized data and statistics about the optimization process.
 *
 * @typedef {Object} OptimizationResult
 * @property {T[]} data - The optimized array of indexable documents.
 * @property {Object} stats - Statistics about the optimization process.
 * @property {number} stats.originalSize - The original size of the data array.
 * @property {number} stats.optimizedSize - The size of the optimized data array.
 * @property {number} stats.compressionRatio - The ratio of the optimized size to the original size.
 */
export declare function optimizeIndex<T extends IndexableDocument>(data: T[]): OptimizationResult<T>;
export {};
