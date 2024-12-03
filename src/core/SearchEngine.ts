import { IndexManager } from './IndexManager';
import { QueryProcessor } from './QueryProcessor';
import { SearchStorage } from '../storage/IndexedDBService';
import { CacheManager } from '../storage/CacheManager';
import { validateSearchOptions } from '@/utils/ValidationUtils';
import { IndexConfig, SearchOptions, SearchResult } from '@/types/types';

export class SearchEngine {
  private indexManager: IndexManager;
  private queryProcessor: QueryProcessor;
  private storage: SearchStorage;
  private cache: CacheManager;
  private config: IndexConfig;

  constructor(config: IndexConfig) {
    this.config = config;
    this.indexManager = new IndexManager(config);
    this.queryProcessor = new QueryProcessor();
    this.storage = new SearchStorage();
    this.cache = new CacheManager();
  }

  async initialize(): Promise<void> {
    try {
      await this.storage.initialize();
      await this.loadIndexes();
    } catch (error) {
      throw new Error(`Failed to initialize search engine: ${error}`);
    }
  }

  async addDocuments<T>(documents: T[]): Promise<void> {
    try {
      await this.indexManager.addDocuments(documents);
      await this.storage.storeIndex(this.config.name, this.indexManager.exportIndex());
    } catch (error) {
      throw new Error(`Failed to add documents: ${error}`);
    }
  }

  async search<T>(query: string, options: SearchOptions = {}): Promise<SearchResult<T>[]> {
    validateSearchOptions(options);
    
    const cacheKey = this.generateCacheKey(query, options);
    const cachedResults = this.cache.get(cacheKey);
    
    if (cachedResults) {
      return cachedResults as SearchResult<T>[];
    }

    const processedQuery = this.queryProcessor.process(query);
    const results = await this.indexManager.search<T>(processedQuery, options);
    
    this.cache.set(cacheKey, results);
    return results;
  }

  private async loadIndexes(): Promise<void> {
    const storedIndex = await this.storage.getIndex(this.config.name);
    if (storedIndex) {
      this.indexManager.importIndex(storedIndex);
    }
  }

  private generateCacheKey(query: string, options: SearchOptions): string {
    return `${query}-${JSON.stringify(options)}`;
  }

  async clearIndex(): Promise<void> {
    await this.storage.clearIndices();
    this.indexManager.clear();
    this.cache.clear();
  }
}
