import { SearchResult } from "@/types";



export class CacheManager {
  private cache: Map<string, { data: SearchResult<any>[]; timestamp: number }>;
  private readonly maxSize: number;
  private readonly ttl: number; // Time to live in milliseconds

  constructor(maxSize: number = 1000, ttlMinutes: number = 5) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttlMinutes * 60 * 1000;
  }

  set(key: string, data: SearchResult<any>[]): void {
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get(key: string): SearchResult<any>[] | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (this.isExpired(entry.timestamp)) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.ttl;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  clear(): void {
    this.cache.clear();
  }
}