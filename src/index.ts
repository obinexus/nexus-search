// Export all from types
export * from './types';

// Core exports
export { SearchEngine } from './core/SearchEngine';
export { IndexManager } from './core/IndexManager';
export { QueryProcessor } from './core/QueryProcessor';

// Algorithm exports
export { TrieNode } from './algorithms/trie/TrieNode';
export { TrieSearch } from './algorithms/trie/TrieSearch';

// Mapper exports
export { DataMapper } from './mappers/DataMapper';
export { IndexMapper } from './mappers/IndexMapper';

// Storage exports
export { CacheManager,IndexedDB } from './storage/index';

export { PerformanceMonitor,createSearchableFields, optimizeIndex, getNestedValue,normalizeFieldValue,
    validateSearchOptions,validateIndexConfig,validateDocument
} from './utils/'
