import { SearchEngine } from '../../core/SearchEngine';
import { IndexConfig, SearchOptions, SearchResult } from '../../types';
import { IndexManager } from '../../core/IndexManager';
import { QueryProcessor } from '../../core/QueryProcessor';
import { SearchStorage } from '../../storage/IndexedDB';
import { CacheManager } from '../../storage/CacheManager';

// Mock dependencies
jest.mock('../../core/IndexManager');
jest.mock('../../core/QueryProcessor');
jest.mock('../../storage/IndexedDB');
jest.mock('../../storage/CacheManager');

describe('SearchEngine', () => {
  let searchEngine: SearchEngine;
  let mockIndexManager: jest.Mocked<IndexManager>;
  let mockQueryProcessor: jest.Mocked<QueryProcessor>;
  let mockStorage: jest.Mocked<SearchStorage>;
  let mockCache: jest.Mocked<CacheManager>;

  const testConfig: IndexConfig = {
    name: 'test-index',
    version: 1,
    fields: ['title', 'content']
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Initialize mocked instances
    mockIndexManager = new IndexManager(testConfig) as jest.Mocked<IndexManager>;
    mockQueryProcessor = new QueryProcessor() as jest.Mocked<QueryProcessor>;
    mockStorage = new SearchStorage() as jest.Mocked<SearchStorage>;
    mockCache = new CacheManager() as jest.Mocked<CacheManager>;

    // Create SearchEngine instance
    searchEngine = new SearchEngine(testConfig);
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await expect(searchEngine.initialize()).resolves.not.toThrow();
      expect(mockStorage.initialize).toHaveBeenCalled();
    });

    test('should handle initialization errors', async () => {
      const error = new Error('Initialization failed');
      mockStorage.initialize.mockRejectedValueOnce(error);

      await expect(searchEngine.initialize()).rejects.toThrow('Failed to initialize search engine');
    });

    test('should load existing indexes on initialization', async () => {
      const existingIndex = { data: 'test' };
      mockStorage.getIndex.mockResolvedValueOnce(existingIndex);

      await searchEngine.initialize();
      expect(mockIndexManager.importIndex).toHaveBeenCalledWith(existingIndex);
    });
  });

  describe('Document Management', () => {
    const testDocuments = [
      { title: 'Test 1', content: 'Content 1' },
      { title: 'Test 2', content: 'Content 2' }
    ];

    test('should add documents successfully', async () => {
      await searchEngine.addDocuments(testDocuments);
      expect(mockIndexManager.addDocuments).toHaveBeenCalledWith(testDocuments);
      expect(mockStorage.storeIndex).toHaveBeenCalled();
    });

    test('should handle document addition errors', async () => {
      const error = new Error('Failed to add documents');
      mockIndexManager.addDocuments.mockRejectedValueOnce(error);

      await expect(searchEngine.addDocuments(testDocuments))
        .rejects.toThrow('Failed to add documents');
    });

    test('should update storage after adding documents', async () => {
      const exportedIndex = { data: 'exported' };
      mockIndexManager.exportIndex.mockReturnValueOnce(exportedIndex);

      await searchEngine.addDocuments(testDocuments);
      expect(mockStorage.storeIndex).toHaveBeenCalledWith(testConfig.name, exportedIndex);
    });
  });

  describe('Search Operations', () => {
    const searchQuery = 'test query';
    const searchOptions: SearchOptions = {
      fuzzy: true,
      maxResults: 10
    };

    test('should perform basic search', async () => {
      const expectedResults: SearchResult<any>[] = [
        { item: 'result1', score: 1, matches: ['test'] }
      ];
      mockIndexManager.search.mockResolvedValueOnce(expectedResults);

      const results = await searchEngine.search(searchQuery);
      expect(results).toEqual(expectedResults);
    });

    test('should use query processor', async () => {
      const processedQuery = 'processed query';
      mockQueryProcessor.process.mockReturnValueOnce(processedQuery);

      await searchEngine.search(searchQuery);
      expect(mockQueryProcessor.process).toHaveBeenCalledWith(searchQuery);
      expect(mockIndexManager.search).toHaveBeenCalledWith(processedQuery, expect.any(Object));
    });

    test('should use cache for repeated searches', async () => {
      const cachedResults: SearchResult<any>[] = [
        { item: 'cached', score: 1, matches: ['test'] }
      ];
      const cacheKey = `${searchQuery}-${JSON.stringify(searchOptions)}`;
      mockCache.get.mockReturnValueOnce(cachedResults);

      const results = await searchEngine.search(searchQuery, searchOptions);
      expect(results).toEqual(cachedResults);
      expect(mockIndexManager.search).not.toHaveBeenCalled();
    });

    test('should cache search results', async () => {
      const newResults: SearchResult<any>[] = [
        { item: 'new', score: 1, matches: ['test'] }
      ];
      mockIndexManager.search.mockResolvedValueOnce(newResults);

      await searchEngine.search(searchQuery, searchOptions);
      expect(mockCache.set).toHaveBeenCalled();
    });

    test('should handle search errors', async () => {
      const error = new Error('Search failed');
      mockIndexManager.search.mockRejectedValueOnce(error);

      await expect(searchEngine.search(searchQuery))
        .rejects.toThrow('Search failed');
    });
  });

  describe('Index Management', () => {
    test('should clear index', async () => {
      await searchEngine.clearIndex();
      expect(mockStorage.clearIndices).toHaveBeenCalled();
      expect(mockIndexManager.clear).toHaveBeenCalled();
      expect(mockCache.clear).toHaveBeenCalled();
    });

    test('should handle clear index errors', async () => {
      const error = new Error('Clear failed');
      mockStorage.clearIndices.mockRejectedValueOnce(error);

      await expect(searchEngine.clearIndex()).rejects.toThrow();
    });
  });

  describe('Configuration', () => {
    test('should initialize with custom config', () => {
      const customConfig: IndexConfig = {
        name: 'custom',
        version: 2,
        fields: ['custom'],
        options: { caseSensitive: true }
      };

      const customEngine = new SearchEngine(customConfig);
      expect(customEngine).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty search query', async () => {
      await expect(searchEngine.search('')).resolves.toEqual([]);
    });

    test('should handle undefined options', async () => {
      await searchEngine.search('query', undefined);
      expect(mockIndexManager.search).toHaveBeenCalled();
    });

    test('should handle null documents', async () => {
      await expect(searchEngine.addDocuments(null as any))
        .rejects.toThrow();
    });
  });
});