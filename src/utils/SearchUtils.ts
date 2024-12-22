import { DocumentValue, IndexableDocument, OptimizationResult, SearchableDocument } from "@/types";

type DocumentContent = {
    [key: string]: DocumentValue | DocumentContent;
};

/**
 * Creates searchable fields from a document based on specified field paths.
 * Handles nested paths and various value types.
 */
export function createSearchableFields(
    document: SearchableDocument,
    fields: string[]
): Record<string, string> {
    if (!document || !document.content || !Array.isArray(fields)) {
        return {};
    }

    const searchableFields: Record<string, string> = {};
    
    for (const field of fields) {
        try {
            const value = getNestedValue(document.content, field);
            if (value !== undefined) {
                searchableFields[field] = normalizeFieldValue(value);
            }
        } catch (error) {
            console.warn(`Error processing field ${field}:`, error);
        }
    }

    return searchableFields;
}

/**
 * Normalizes field values into searchable strings.
 * Handles various data types and nested structures.
 */
export function normalizeFieldValue(value: DocumentValue): string {
    try {
        if (value === null || value === undefined) {
            return '';
        }

        if (typeof value === 'string') {
            return value.toLowerCase().trim();
        }

        if (Array.isArray(value)) {
            return value
                .map(v => normalizeFieldValue(v))
                .filter(Boolean)
                .join(' ');
        }

        if (typeof value === 'object') {
            return Object.values(value)
                .map(v => normalizeFieldValue(v))
                .filter(Boolean)
                .join(' ');
        }

        return String(value).toLowerCase().trim();
    } catch (error) {
        console.warn('Error normalizing field value:', error);
        return '';
    }
}

/**
 * Retrieves a nested value from an object using dot notation path.
 * Handles arrays and nested objects safely.
 */
export function getNestedValue(
    obj: DocumentContent,
    path: string
): DocumentValue | undefined {
    if (!obj || !path) {
        return undefined;
    }

    try {
        const keys = path.split('.');
        let current: DocumentValue | DocumentContent = obj;

        for (const key of keys) {
            if (!current || typeof current !== 'object') {
                return undefined;
            }

            if (Array.isArray(current)) {
                // Handle array indexing
                const index = parseInt(key, 10);
                if (isNaN(index)) {
                    return undefined;
                }
                current = current[index];
            } else {
                current = current[key];
            }
        }

        return current as DocumentValue;
    } catch (error) {
        console.warn(`Error getting nested value for path ${path}:`, error);
        return undefined;
    }
}

/**
 * Optimizes an array of indexable documents by removing duplicates 
 * and sorting them efficiently.
 * 
 * @template T - The type of the indexable document.
 * @param {T[]} data - Array of indexable documents to optimize.
 * @returns {OptimizationResult<T>} Optimized data and optimization statistics.
 */
export function optimizeIndex<T extends IndexableDocument>(
    data: T[]
): OptimizationResult<T> {
    if (!Array.isArray(data)) {
        return {
            data: [],
            stats: {
                originalSize: 0,
                optimizedSize: 0,
                compressionRatio: 1
            }
        };
    }

    try {
        // Use Map for more efficient duplicate removal
        const uniqueMap = new Map<string, T>();
        
        for (const item of data) {
            const key = JSON.stringify(sortObjectKeys(item));
            uniqueMap.set(key, item);
        }

        const sorted = Array.from(uniqueMap.values()).sort((a, b) => {
            const aKey = generateSortKey(a);
            const bKey = generateSortKey(b);
            return aKey.localeCompare(bKey);
        });

        return {
            data: sorted,
            stats: {
                originalSize: data.length,
                optimizedSize: sorted.length,
                compressionRatio: data.length ? sorted.length / data.length : 1
            }
        };
    } catch (error) {
        console.warn('Error optimizing index:', error);
        return {
            data: [...data],
            stats: {
                originalSize: data.length,
                optimizedSize: data.length,
                compressionRatio: 1
            }
        };
    }
}

/**
 * Helper function to sort object keys recursively for consistent serialization.
 */
function sortObjectKeys<T extends object>(obj: T): T {
    if (Array.isArray(obj)) {
        return obj.map(sortObjectKeys) as unknown as T;
    }
    
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    return Object.keys(obj)
        .sort()
        .reduce((sorted, key) => {
            (sorted as any)[key] = sortObjectKeys((obj as any)[key]);
            return sorted;
        }, {} as T);
}

/**
 * Helper function to generate consistent sort keys for documents.
 */
function generateSortKey(doc: IndexableDocument): string {
    if (!doc.id || !doc.content) {
        return '';
    }

    try {
        return `${doc.id}:${Object.keys(doc.content).sort().join(',')}`;
    } catch {
        return doc.id;
    }
}