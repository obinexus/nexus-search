import { CacheEntry, CacheStrategy, SearchResult } from "@/types";



export class CacheManager {
    private cache: Map<string, CacheEntry>;
    private readonly maxSize: number;
    private readonly ttl: number;
    private strategy: CacheStrategy; // Changed from readonly to private
    private accessOrder: string[];
    private stats: {
        hits: number;
        misses: number;
        evictions: number;
    };

    constructor(
        maxSize: number = 1000, 
        ttlMinutes: number = 5, 
        initialStrategy: CacheStrategy = 'LRU'
    ) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttlMinutes * 60 * 1000;
        this.strategy = initialStrategy;
        this.accessOrder = [];
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
    }

    set(key: string, data: SearchResult<unknown>[]): void {
        if (this.cache.size >= this.maxSize) {
            this.evict();
        }

        const entry: CacheEntry = {
            data,
            timestamp: Date.now(),
            lastAccessed: Date.now(),
            accessCount: 1
        };

        this.cache.set(key, entry);
        this.updateAccessOrder(key);
    }

    get(key: string): SearchResult<unknown>[] | null {
        const entry = this.cache.get(key);

        if (!entry) {
            this.stats.misses++;
            return null;
        }

        if (this.isExpired(entry.timestamp)) {
            this.cache.delete(key);
            this.removeFromAccessOrder(key);
            this.stats.misses++;
            return null;
        }

        entry.lastAccessed = Date.now();
        entry.accessCount++;
        this.updateAccessOrder(key);
        this.stats.hits++;

        return entry.data;
    }

    clear(): void {
        this.cache.clear();
        this.accessOrder = [];
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
    }

    getStats() {
        return {
            ...this.stats,
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate: this.stats.hits / (this.stats.hits + this.stats.misses),
            strategy: this.strategy
        };
    }

    private isExpired(timestamp: number): boolean {
        return Date.now() - timestamp > this.ttl;
    }

    private evict(): void {
        const keyToEvict = this.strategy === 'LRU' 
            ? this.findLRUKey()
            : this.findMRUKey();

        if (keyToEvict) {
            this.cache.delete(keyToEvict);
            this.removeFromAccessOrder(keyToEvict);
            this.stats.evictions++;
        }
    }

    private findLRUKey(): string | null {
        return this.accessOrder[0] || null;
    }

    private findMRUKey(): string | null {
        return this.accessOrder[this.accessOrder.length - 1] || null;
    }

    private updateAccessOrder(key: string): void {
        this.removeFromAccessOrder(key);

        if (this.strategy === 'LRU') {
            this.accessOrder.push(key); // Most recently used at end
        } else {
            this.accessOrder.unshift(key); // Most recently used at start
        }
    }

    private removeFromAccessOrder(key: string): void {
        const index = this.accessOrder.indexOf(key);
        if (index !== -1) {
            this.accessOrder.splice(index, 1);
        }
    }

    setStrategy(newStrategy: CacheStrategy): void {
        if (newStrategy === this.strategy) return;
        
        this.strategy = newStrategy;
        const entries = [...this.accessOrder];
        this.accessOrder = [];
        entries.forEach(key => this.updateAccessOrder(key));
    }

    prune(): number {
        let prunedCount = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (this.isExpired(entry.timestamp)) {
                this.cache.delete(key);
                this.removeFromAccessOrder(key);
                prunedCount++;
            }
        }
        return prunedCount;
    }

    analyze(): {
        hitRate: number;
        averageAccessCount: number;
        mostAccessedKeys: Array<{ key: string; count: number }>;
    } {
        const totalAccesses = this.stats.hits + this.stats.misses;
        const hitRate = totalAccesses > 0 ? this.stats.hits / totalAccesses : 0;

        let totalAccessCount = 0;
        const accessCounts = new Map<string, number>();

        for (const [key, entry] of this.cache.entries()) {
            totalAccessCount += entry.accessCount;
            accessCounts.set(key, entry.accessCount);
        }

        const averageAccessCount = this.cache.size > 0 
            ? totalAccessCount / this.cache.size 
            : 0;

        const mostAccessedKeys = Array.from(accessCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([key, count]) => ({ key, count }));

        return {
            hitRate,
            averageAccessCount,
            mostAccessedKeys
        };
    }
}