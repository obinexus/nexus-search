export declare function createSearchableFields<T>(document: T, fields: string[]): Record<string, string>;
export declare function normalizeFieldValue(value: any): string;
export declare function getNestedValue(obj: any, path: string): any;
export declare function optimizeIndex(data: any[]): any[];
