export interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

export interface CacheOptions {
    maxSize: number;
    ttlMinutes: number;
}
