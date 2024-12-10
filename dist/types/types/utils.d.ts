import { TokenInfo } from "./core";
import { SearchContext, SearchOptions, SearchStats } from "./search";
export type PrimitiveValue = string | number | boolean | null;
export type ArrayValue = PrimitiveValue[];
export type ComplexValue = Record<string, PrimitiveValue | ArrayValue>;
export type DocumentValue = PrimitiveValue | ArrayValue | ComplexValue;
export type DocumentMetadata = Record<string, DocumentValue>;
export interface IndexableDocument {
    id: string;
    content: Record<string, DocumentValue>;
    metadata?: DocumentMetadata;
}
export interface PerformanceMetric {
    avg: number;
    min: number;
    max: number;
    count: number;
}
export interface MetricsResult {
    [key: string]: PerformanceMetric;
}
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
export declare function createSearchStats(): SearchStats;
export declare function createSearchContext(query: string, options?: SearchOptions): SearchContext;
export declare function createTokenInfo(value: string, type: TokenInfo['type'], position: number): TokenInfo;
