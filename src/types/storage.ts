export interface StorageEntry<T> {
    id: string;
    data: T;
    timestamp: number;
}

export interface StorageOptions {
    maxSize?: number;
    ttl?: number;
}
