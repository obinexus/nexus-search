import { DocumentValue, IndexableDocument, OptimizationResult } from "@/types";

export function createSearchableFields<T extends IndexableDocument>(
    document: T,
    fields: string[]
): Record<string, string> {
    const searchableFields: Record<string, string> = {};
    fields.forEach(field => {
        const value = getNestedValue(document, field);
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

export function getNestedValue(obj: Record<string, DocumentValue>, path: string): DocumentValue {
    return path.split('.').reduce((current, key) => {
        if (current && typeof current === 'object' && !Array.isArray(current)) {
            return (current as Record<string, DocumentValue>)[key];
        }
        return undefined;
    }, obj as Record<string, DocumentValue>);
}

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