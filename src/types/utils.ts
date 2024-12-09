import { TokenInfo } from "./core";
import { SearchContext, SearchOptions, SearchStats } from "./search";

// Document value types
export type PrimitiveValue = string | number | boolean | null;
export type ArrayValue = PrimitiveValue[];
export type ComplexValue = Record<string, PrimitiveValue | ArrayValue>;
export type DocumentValue = PrimitiveValue | ArrayValue | ComplexValue;
export type DocumentMetadata = Record<string, DocumentValue>;

// Core document interfaces
export interface IndexableDocument {
    id: string;
    content: Record<string, DocumentValue>;
    metadata?: DocumentMetadata;
}

// Performance monitoring types
export interface PerformanceMetric {
    avg: number;
    min: number;
    max: number;
    count: number;
}

export interface MetricsResult {
    [key: string]: PerformanceMetric;
}

// Scoring types
export interface TextScore {
    termFrequency: number;
    documentFrequency: number;
    score: number;
}

export interface DocumentScore {
    textScore: number;
    documentRank: number;
    termFrequency: number;
    inverseDocFreq: number;
}



// Optimization types
export interface OptimizationOptions {
    deduplication?: boolean;
    sorting?: boolean;
    compression?: boolean;
}

export interface OptimizationResult<T> {
    data: T[];
    stats: {
        originalSize: number;
        optimizedSize: number;
        compressionRatio?: number;
    };
}

// Factory functions
export function createSearchStats(): SearchStats {
    return {
        totalResults: 0,
        searchTime: 0,
        indexSize: 0,
        queryComplexity: 0
    };
}

export function createSearchContext(query: string, options: SearchOptions = {}): SearchContext {
    return {
        query,
        options,
        startTime: Date.now(),
        results: [],
        stats: createSearchStats()
    };
}

export function createTokenInfo(value: string, type: TokenInfo['type'], position: number): TokenInfo {
    return {
        value,
        type,
        position,
        length: value.length
    };
}