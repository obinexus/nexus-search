import { CacheManager } from '../../storage/CacheManager';
import { SearchResult } from '../../types';

describe('CacheManager', () => {
  let cache: CacheManager;
  const maxSize = 3;
  const ttlMinutes = 1;

  beforeEach(() => {
    cache = new CacheManager(maxSize, ttlMinutes);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Operations', () => {
    test('should store and retrieve values', () => {
      const key = 'test-key';
      const value: SearchResult<any>[] = [
        { item: 'test', score: 1, matches: ['test'] }
      ];

      cache.set(key, value);
      expect(cache.get(key)).toEqual(value);
    });

    test('should return null for non-existent keys', () => {
      expect(cache.get('non-existent')).toBeNull();
    });

    test('should clear all entries', () => {
      cache.set('key1', [{ item: 'test1', score: 1, matches: [] }]);
      cache.set('key2', [{ item: 'test2', score: 1, matches: [] }]);

      cache.clear();
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('Capacity Management', () => {
    test('should respect maximum size', () => {
      // Fill cache to capacity
      for (let i = 0; i < maxSize + 1; i++) {
        cache.set(`key${i}`, [{ item: `test${i}`, score: 1, matches: [] }]);
      }

      // Oldest entry should be evicted
      expect(cache.get('key0')).toBeNull();
      expect(cache.get(`key${maxSize}`)).not.toBeNull();
    });

    test('should evict oldest entries first', () => {
      // Add entries with different timestamps
      cache.set('old', [{ item: 'old', score: 1, matches: [] }]);
      jest.advanceTimersByTime(1000);
      cache.set('newer', [{ item: 'newer', score: 1, matches: [] }]);
      jest.advanceTimersByTime(1000);
      cache.set('newest', [{ item: 'newest', score: 1, matches: [] }]);

      // Add one more to trigger eviction
      cache.set('extra', [{ item: 'extra', score: 1, matches: [] }]);

      expect(cache.get('old')).toBeNull();
      expect(cache.get('newer')).not.toBeNull();
    });
  });

  describe('TTL Handling', () => {
    test('should expire entries after TTL', () => {
      cache.set('test', [{ item: 'test', score: 1, matches: [] }]);
      
      // Advance time beyond TTL
      jest.advanceTimersByTime((ttlMinutes * 60 * 1000) + 1);
      
      expect(cache.get('test')).toBeNull();
    });

    test('should not expire entries before TTL', () => {
      const value = [{ item: 'test', score: 1, matches: [] }];
      cache.set('test', value);
      
      // Advance time but not beyond TTL
      jest.advanceTimersByTime((ttlMinutes * 60 * 1000) - 1);
      
      expect(cache.get('test')).toEqual(value);
    });

    test('should handle expired item cleanup', () => {
      cache.set('expire1', [{ item: 'test1', score: 1, matches: [] }]);
      jest.advanceTimersByTime(ttlMinutes * 60 * 1000 / 2);
      cache.set('expire2', [{ item: 'test2', score: 1, matches: [] }]);
      
      jest.advanceTimersByTime(ttlMinutes * 60 * 1000);
      
      expect(cache.get('expire1')).toBeNull();
      expect(cache.get('expire2')).not.toBeNull();
    });
  });

  describe('Edge Cases', () => {
    test('should handle undefined values', () => {
      expect(() => cache.set('test', undefined as any)).toThrow();
    });

    test('should handle empty arrays', () => {
      cache.set('test', []);
      expect(cache.get('test')).toEqual([]);
    });

    test('should handle concurrent operations', () => {
      const operations = Array.from({ length: 100 }, (_, i) => ({
        key: `key${i}`,
        value: [{ item: `test${i}`, score: 1, matches: [] }]
      }));

      operations.forEach(({ key, value }) => {
        cache.set(key, value);
        cache.get(key);
      });

      expect(cache.get(`key${operations.length - 1}`)).not.toBeNull();
    });
  });
});