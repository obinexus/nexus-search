import { DocumentValue, IndexableDocument, OptimizationResult } from "@/types";

type DocumentContent = {
    [key: string]: DocumentValue | DocumentContent;
};

export function createSearchableFields<T extends IndexableDocument>(
    document: T,
    fields: string[]
): Record<string, string> {
    const searchableFields: Record<string, string> = {};
    fields.forEach(field => {
        const value = getNestedValue(document.content, field);
        if (value !== undefined) {
            searchableFields[field] = normalizeFieldValue(value);
        }
    });
    return searchableFields;
}

export function normalizeFieldValue(value: DocumentValue): string {
    if (typeof value === 'string') {
        return value.toLowerCase().trim();
    }
    if (Array.isArray(value)) {
        return value.map(v => normalizeFieldValue(v)).join(' ');
    }
    if (typeof value === 'object' && value !== null) {
        return Object.values(value).map(v => normalizeFieldValue(v)).join(' ');
    }
    return String(value);
}

export function getNestedValue(obj: DocumentContent, path: string): DocumentValue | undefined {
    const keys = path.split('.');
    let current: DocumentValue | DocumentContent = obj;

    for (const key of keys) {
        if (current && typeof current === 'object' && !Array.isArray(current) && key in current) {
            current = current[key];
        } else {
            return undefined;
        }
    }

    return current as DocumentValue;
}

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
export function optimizeIndex<T extends IndexableDocument>(data: T[]): OptimizationResult<T> {
    const uniqueData = Array.from(new Set(data.map(item =>
        JSON.stringify(item)
    ))).map(item => JSON.parse(item)) as T[];

    const sorted = uniqueData.sort((a, b) =>
        JSON.stringify(a).localeCompare(JSON.stringify(b))
    );

    return {
        data: sorted,
        stats: {
            originalSize: data.length,
            optimizedSize: sorted.length,
            compressionRatio: sorted.length / data.length
        }
    };
}