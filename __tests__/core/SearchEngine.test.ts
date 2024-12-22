import { SearchEngine, IndexManager, QueryProcessor } from "@/index";
import { SearchStorage, CacheManager } from "@/storage";
import { 
  IndexConfig, 
  SearchOptions, 
  SearchResult, 
  IndexedDocument, 
  SearchEvent,
  SearchEventListener
} from "@/types";

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

  const testDocuments: IndexedDocument[] = [
    {
      id: 'doc1',
      fields: {
        title: 'Test 1',
        content: 'Content 1'
      }
    },
    {
      id: 'doc2',
      fields: {
        title: 'Test 2',
        content: 'Content 2'
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
    test('should initialize successfully', async () => {
      await expect(searchEngine.initialize()).resolves.not.toThrow();
      expect(mockStorage.initialize).toHaveBeenCalled();
    });

    test('should handle initialization errors', async () => {
      const error = new Error('Initialization failed');
      mockStorage.initialize.mockRejectedValueOnce(error);
      await expect(searchEngine.initialize()).rejects.toThrow('Failed to initialize search engine');
    });

    test('should handle storage fallback', async () => {
      mockStorage.initialize.mockRejectedValueOnce(new Error('Storage failed'));
      await searchEngine.initialize();
      expect(mockStorage.initialize).toHaveBeenCalledTimes(2); // Initial + fallback
    });

    test('should load existing indexes on initialization', async () => {
      const existingIndex = {
        documents: testDocuments,
        indexState: {},
        config: testConfig
      };
      mockStorage.getIndex.mockResolvedValueOnce(existingIndex);
      await searchEngine.initialize();
      expect(mockIndexManager.importIndex).toHaveBeenCalledWith(existingIndex);
    });
  });

  describe('Document Management', () => {
    beforeEach(async () => {
      await searchEngine.initialize();
    });

    test('should add documents successfully', async () => {
      await searchEngine.addDocuments(testDocuments);
      expect(mockIndexManager.addDocuments).toHaveBeenCalledWith(testDocuments);
    });

    test('should handle document removal', async () => {
      await searchEngine.addDocuments(testDocuments);
      await searchEngine.removeDocument('doc1');
      expect(mockIndexManager.removeDocument).toHaveBeenCalledWith('doc1');
      expect(mockCache.clear).toHaveBeenCalled();
    });

    test('should handle document updates', async () => {
      const updatedDoc: IndexedDocument = {
        id: 'doc1',
        fields: {
          title: 'Updated Title',
          content: 'Updated Content'
        }
      };
      await searchEngine.addDocuments([testDocuments[0]]);
      await searchEngine.updateDocument(updatedDoc);
      expect(mockIndexManager.updateDocument).toHaveBeenCalledWith(updatedDoc);
    });

    test('should fail to update non-existent document', async () => {
      const nonExistentDoc: IndexedDocument = {
        id: 'non-existent',
        fields: { title: 'Test' }
      };
      await expect(searchEngine.updateDocument(nonExistentDoc))
        .rejects.toThrow('Document non-existent not found');
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

    test('should process query and perform search', async () => {
      const processedQuery = 'processed test query';
      mockQueryProcessor.process.mockReturnValueOnce(processedQuery);
      
      await searchEngine.search(searchQuery, searchOptions);
      
      expect(mockQueryProcessor.process).toHaveBeenCalledWith(searchQuery);
      expect(mockIndexManager.search).toHaveBeenCalledWith(processedQuery, searchOptions);
    });

    test('should emit search events', async () => {
      const eventListener = jest.fn();
      searchEngine.addEventListener(eventListener);

      await searchEngine.search(searchQuery);

      expect(eventListener).toHaveBeenCalledWith(expect.objectContaining({
        type: 'search:start'
      }));
      expect(eventListener).toHaveBeenCalledWith(expect.objectContaining({
        type: 'search:complete'
      }));
    });

    test('should handle search errors with events', async () => {
      const eventListener = jest.fn();
      searchEngine.addEventListener(eventListener);
      
      const error = new Error('Search failed');
      mockIndexManager.search.mockRejectedValueOnce(error);

      await expect(searchEngine.search(searchQuery)).rejects.toThrow();
      
      expect(eventListener).toHaveBeenCalledWith(expect.objectContaining({
        type: 'search:error',
        error
      }));
    });
  });

  describe('Event Handling', () => {
    test('should manage event listeners', () => {
      const listener: SearchEventListener = jest.fn();
      
      searchEngine.addEventListener(listener);
      expect(searchEngine['eventListeners'].has(listener)).toBe(true);
      
      searchEngine.removeEventListener(listener);
      expect(searchEngine['eventListeners'].has(listener)).toBe(false);
    });

    test('should handle event listener errors', async () => {
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      
      searchEngine.addEventListener(errorListener);
      
      // Should not throw despite listener error
      await expect(searchEngine.search('test')).resolves.not.toThrow();
    });
  });

  describe('Cleanup', () => {
    test('should close properly', async () => {
      await searchEngine.initialize();
      await searchEngine.close();
      
      expect(mockStorage.close).toHaveBeenCalled();
      expect(mockCache.clear).toHaveBeenCalled();
      expect(searchEngine.isReady).toBe(false);
    });

    test('should handle close errors gracefully', async () => {
      mockStorage.close.mockRejectedValueOnce(new Error('Close failed'));
      await searchEngine.initialize();
      await expect(searchEngine.close()).resolves.not.toThrow();
    });
  });

  describe('Debug Methods', () => {
    test('should report indexed document count', async () => {
      await searchEngine.initialize();
      await searchEngine.addDocuments(testDocuments);
      expect(searchEngine.getIndexedDocumentCount()).toBe(2);
    });

    test('should expose trie state', async () => {
      await searchEngine.initialize();
      await searchEngine.addDocuments(testDocuments);
      expect(searchEngine.getTrieState()).toBeDefined();
    });
  });
});