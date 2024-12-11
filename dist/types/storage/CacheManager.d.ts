import { CacheStrategy, SearchResult } from "@/types";
export declare class CacheManager {
    private cache;
    private readonly maxSize;
    private readonly ttl;
    private strategy;
    private accessOrder;
    private stats;
    constructor(maxSize?: number, ttlMinutes?: number, initialStrategy?: CacheStrategy);
    set(key: string, data: SearchResult<unknown>[]): void;
    get(key: string): SearchResult<unknown>[] | null;
    clear(): void;
    getStats(): {
        size: number;
        maxSize: number;
        hitRate: number;
        strategy: "LRU" | "MRU";
        hits: number;
        misses: number;
        evictions: number;
    };
    private isExpired;
    private evict;
    private findLRUKey;
    private findMRUKey;
    private updateAccessOrder;
    private removeFromAccessOrder;
    setStrategy(newStrategy: CacheStrategy): void;
    prune(): number;
    analyze(): {
        hitRate: number;
        averageAccessCount: number;
        mostAccessedKeys: Array<{
            key: string;
            count: number;
        }>;
    };
}
