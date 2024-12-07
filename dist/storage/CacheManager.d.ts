import { SearchResult } from "@/types/compactablity";
export declare class CacheManager {
    private cache;
    private readonly maxSize;
    private readonly ttl;
    constructor(maxSize?: number, ttlMinutes?: number);
    set(key: string, data: SearchResult<any>[]): void;
    get(key: string): SearchResult<any>[] | null;
    private isExpired;
    private evictOldest;
    clear(): void;
}
