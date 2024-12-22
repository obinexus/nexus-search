import { SearchResult } from "./search";
export interface CacheOptions {
    maxSize: number;
    ttlMinutes: number;
}
export interface CacheEntry {
    data: SearchResult<unknown>[];
    timestamp: number;
    lastAccessed: number;
    accessCount: number;
}
export interface CacheOptions {
    strategy: CacheStrategy;
    maxSize: number;
    ttlMinutes: number;
}
export declare enum CacheStrategyType {
    LRU = "LRU",
    MRU = "MRU"
}
export type CacheStrategy = keyof typeof CacheStrategyType;
export interface CacheStats {
    hits: number;
    misses: number;
    evictions: number;
}
