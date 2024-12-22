import { SearchEngine, IndexManager, QueryProcessor } from "@/index";
import { SearchStorage, CacheManager } from "@/storage";
import { 
  IndexConfig, 
  SearchOptions, 
  SearchResult, 
  IndexedDocument, 
  SearchEvent,
  SearchEventListener,
  SearchEngineConfig
} from "@/types";

// Mock dependencies
jest.mock('../../core/IndexManager');
jest.mock('../../core/QueryProcessor');
jest.mock('../../storage/IndexedDB');
jest.mock('../../storage/CacheManager');
jest.mock('../../algorithms/trie');

describe('SearchEngine', () => {
  let searchEngine: SearchEngine;
  let mockIndexManager: jest.Mocked<IndexManager>;
  let mockQueryProcessor: jest.Mocked<QueryProcessor>;
  let mockStorage: jest.Mocked<SearchStorage>;
  let mockCache: jest.Mocked<CacheManager>;

  const testConfig: SearchEngineConfig = {
    name: 'test-index',
    version: 1,
    fields: ['title', 'content'],
    storage: { type: 'memory' }
  };

  const testDocuments: IndexedDocument[] = [
    {
      id: 'doc1',
      fields: {
        title: 'Test 1',
        content: 'Content 1'
      },
      metadata: {
        indexed: Date.now(),
        lastModified: Date.now()
      }
    },
    {
      id: 'doc2',
      fields: {
        title: 'Test 2',
        content: 'Content 2'
      },
      metadata: {
        indexed: Date.now(),
        lastModified: Date.now()
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockIndexManager = new IndexManager(testConfig) as jest.Mocked<IndexManager>;
    mockQueryProcessor = new QueryProcessor() as jest.Mocked<QueryProcessor>;
    mockStorage = new SearchStorage() as jest.Mocked<SearchStorage>;
    mockCache = new CacheManager() as jest.Mocked<CacheManager>;
    searchEngine = new SearchEngine(testConfig);
  });

  describe('Initialization', () => {
    test('should initialize only once', async () => {
      await searchEngine.initialize();
      await searchEngine.initialize();
      expect(mockStorage.initialize).toHaveBeenCalledTimes(1);
    });

    test('should handle initialization with empty index', async () => {
      mockStorage.getIndex.mockResolvedValueOnce(null);
      await searchEngine.initialize();
      expect(mockIndexManager.importIndex).not.toHaveBeenCalled();
    });

    test('should handle corrupted index data', async () => {
      mockStorage.getIndex.mockResolvedValueOnce({} as any);
      await expect(searchEngine.initialize()).resolves.not.toThrow();
    });

    test('should emit initialization events', async () => {
      const eventListener = jest.fn();
      searchEngine.addEventListener(eventListener);
      await searchEngine.initialize();
      expect(eventListener).toHaveBeenCalledWith(expect.objectContaining({
        type: 'engine:initialized'
      }));
    });
  });

  describe('Document Management', () => {
    beforeEach(async () => {
      await searchEngine.initialize();
    });

    test('should generate ID for documents without one', async () => {
      const docWithoutId = { ...testDocuments[0] };
      delete docWithoutId.id;
      await searchEngine.addDocuments([docWithoutId]);
      expect(mockIndexManager.addDocuments).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.stringContaining(testConfig.name)
          })
        ])
      );
    });

    test('should handle empty document array', async () => {
      await expect(searchEngine.addDocuments([])).resolves.not.toThrow();
    });

    test('should handle duplicate document IDs', async () => {
      const duplicateDocs = [testDocuments[0], { ...testDocuments[0] }];
      await searchEngine.addDocuments(duplicateDocs);
      expect(searchEngine.getIndexedDocumentCount()).toBe(1);
    });

    test('should update document metadata on add', async () => {
      const beforeTime = Date.now();
      await searchEngine.addDocuments([testDocuments[0]]);
      const doc = searchEngine.getDocumentById(testDocuments[0].id);
      expect(doc?.metadata?.lastModified).toBeGreaterThanOrEqual(beforeTime);
    });

    test('should handle document removal with data cleanup', async () => {
      await searchEngine.addDocuments([testDocuments[0]]);
      await searchEngine.removeDocument(testDocuments[0].id);
      expect(searchEngine.getDocumentById(testDocuments[0].id)).toBeUndefined();
      expect(mockCache.clear).toHaveBeenCalled();
    });

    test('should validate document fields before adding', async () => {
      const invalidDoc = {
        id: 'invalid',
        fields: {} // Missing required fields
      } as IndexedDocument;
      await expect(searchEngine.addDocuments([invalidDoc]))
        .rejects.toThrow();
    });
  });

  describe('Search Operations', () => {
    const searchQuery = 'test query';
    const searchOptions: SearchOptions = {
      fuzzy: true,
      limit: 10
    };

    beforeEach(async () => {
      await searchEngine.initialize();
      await searchEngine.addDocuments(testDocuments);
    });

    test('should handle empty query string', async () => {
      const results = await searchEngine.search('');
      expect(results).toEqual([]);
    });

    test('should handle invalid query values', async () => {
      const results = await searchEngine.search(null as any);
      expect(results).toEqual([]);
    });

    test('should use cache for repeated searches', async () => {
      const mockResults: SearchResult<IndexedDocument>[] = [{
        id: 'doc1',
        score: 1.0,
        document: testDocuments[0]
      }];
      mockCache.get.mockReturnValueOnce(mockResults);

      const results = await searchEngine.search(searchQuery, searchOptions);
      expect(results).toEqual(mockResults);
      expect(mockIndexManager.search).not.toHaveBeenCalled();
    });

    test('should update metadata on search', async () => {
      const beforeTime = Date.now();
      await searchEngine.search(searchQuery);
      const results = await searchEngine.search(searchQuery);
      results.forEach(result => {
        expect(result.metadata?.lastAccessed).toBeGreaterThanOrEqual(beforeTime);
      });
    });

    test('should handle search with specific fields', async () => {
      const fieldOptions = { ...searchOptions, fields: ['title'] };
      await searchEngine.search(searchQuery, fieldOptions);
      expect(mockIndexManager.search).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ fields: ['title'] })
      );
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle large document batches', async () => {
      const largeBatch = Array(1000).fill(null).map((_, i) => ({
        ...testDocuments[0],
        id: `doc${i}`
      }));
      await expect(searchEngine.addDocuments(largeBatch)).resolves.not.toThrow();
    });

    test('should handle concurrent operations', async () => {
      const operations = [
        searchEngine.addDocuments([testDocuments[0]]),
        searchEngine.search('test'),
        searchEngine.removeDocument('doc1'),
        searchEngine.addDocuments([testDocuments[1]])
      ];
      await expect(Promise.all(operations)).resolves.not.toThrow();
    });

    test('should handle rapid sequential operations', async () => {
      for (let i = 0; i < 10; i++) {
        await searchEngine.addDocuments([{ ...testDocuments[0], id: `doc${i}` }]);
        await searchEngine.search('test');
      }
      expect(searchEngine.getIndexedDocumentCount()).toBe(10);
    });
  });

  describe('Event System', () => {
    test('should handle multiple event listeners', () => {
      const listeners = Array(5).fill(null).map(() => jest.fn());
      listeners.forEach(listener => searchEngine.addEventListener(listener));
      
      searchEngine['emitEvent']({
        type: 'test',
        timestamp: Date.now()
      });

      listeners.forEach(listener => {
        expect(listener).toHaveBeenCalledTimes(1);
      });
    });

    test('should emit events in correct order', async () => {
      const events: string[] = [];
      const listener = (event: SearchEvent) => events.push(event.type);
      
      searchEngine.addEventListener(listener);
      await searchEngine.initialize();
      await searchEngine.addDocuments([testDocuments[0]]);
      
      expect(events).toEqual([
        'engine:initialized',
        'index:start',
        'index:complete'
      ]);
    });

    test('should include detailed error information', async () => {
      const errorListener = jest.fn();
      searchEngine.addEventListener(errorListener);
      
      const error = new Error('Test error');
      mockIndexManager.addDocuments.mockRejectedValueOnce(error);
      
      await expect(searchEngine.addDocuments(testDocuments)).rejects.toThrow();
      
      expect(errorListener).toHaveBeenCalledWith(expect.objectContaining({
        type: 'index:error',
        error: error
      }));
    });
  });

  describe('Cleanup and Resource Management', () => {
    test('should clear all data on index clear', async () => {
      await searchEngine.initialize();
      await searchEngine.addDocuments(testDocuments);
      await searchEngine.clearIndex();
      
      expect(searchEngine.getIndexedDocumentCount()).toBe(0);
      expect(mockStorage.clearIndices).toHaveBeenCalled();
      expect(mockCache.clear).toHaveBeenCalled();
    });

    test('should handle cleanup after failed operations', async () => {
      await searchEngine.initialize();
      mockIndexManager.addDocuments.mockRejectedValueOnce(new Error());
      
      await expect(searchEngine.addDocuments(testDocuments)).rejects.toThrow();
      expect(mockCache.clear).toHaveBeenCalled();
    });

    test('should maintain consistency after errors', async () => {
      await searchEngine.initialize();
      mockIndexManager.addDocuments.mockRejectedValueOnce(new Error());
      
      await expect(searchEngine.addDocuments(testDocuments)).rejects.toThrow();
      expect(searchEngine.getIndexedDocumentCount()).toBe(0);
    });
  });
});