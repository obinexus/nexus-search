import { DocumentValue, IndexableDocument, OptimizationResult } from "@/types";
type DocumentContent = {
    [key: string]: DocumentValue | DocumentContent;
};
export declare function createSearchableFields<T extends IndexableDocument>(document: T, fields: string[]): Record<string, string>;
export declare function normalizeFieldValue(value: DocumentValue): string;
export declare function getNestedValue(obj: DocumentContent, path: string): DocumentValue | undefined;
export declare function optimizeIndex<T extends IndexableDocument>(data: T[]): OptimizationResult<T>;
export {};
