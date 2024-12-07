import { SearchDBSchema, MetadataEntry } from '@/types/storage';
import { IndexOptions, SearchOptions, IndexConfig } from '@/types/types';
import { openDB, DBSchema, IDBPDatabase } from 'idb';


export const DEFAULT_INDEX_OPTIONS: Required<IndexOptions> = {
  caseSensitive: false,
  stemming: true,
  stopWords: ['the', 'a', 'an', 'and', 'or', 'but'],
  minWordLength: 2,
  maxWordLength: 50,
  fuzzyThreshold: 0.8
};

export const DEFAULT_SEARCH_OPTIONS: Required<SearchOptions> = {
  fuzzy: false,
  maxResults: 10,
  threshold: 0.5,
  fields: [],
  sortBy: 'score',
  sortOrder: 'desc',
  page: 1,
  pageSize: 10
  
};

export class IndexedDB {
  private db: IDBPDatabase<SearchDBSchema> | null = null;
  private readonly DB_NAME = 'nexus_search_db';
  private readonly DB_VERSION = 1;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Initialize immediately to catch early failures
    this.initPromise = this.initialize();
  }

  async initialize(): Promise<void> {
    if (this.db) return;

    try {
      this.db = await openDB<SearchDBSchema>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
          // Handle version upgrades
          if (!db.objectStoreNames.contains('searchIndices')) {
            const indexStore = db.createObjectStore('searchIndices', { keyPath: 'id' });
            indexStore.createIndex('timestamp', 'timestamp');
          }

          if (!db.objectStoreNames.contains('metadata')) {
            const metaStore = db.createObjectStore('metadata', { keyPath: 'id' });
            metaStore.createIndex('lastUpdated', 'lastUpdated');
          }
        },
        blocked() {
          console.warn('Database upgrade was blocked');
        },
        blocking() {
          console.warn('Current database version is blocking a newer version');
        },
        terminated() {
          console.error('Database connection was terminated');
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Storage initialization failed: ${message}`);
    }
  }

  private async ensureConnection(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }

    if (!this.db) {
      throw new Error('Database connection not available');
    }
  }

  async storeIndex(key: string, data: any): Promise<void> {
    await this.ensureConnection();

    try {
      const entry = {
        id: key,
        data,
        timestamp: Date.now(),
      };

      await this.db!.put('searchIndices', entry);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to store index: ${message}`);
    }
  }

  async getIndex(key: string): Promise<any | null> {
    await this.ensureConnection();

    try {
      const entry = await this.db!.get('searchIndices', key);
      return entry?.data || null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to retrieve index: ${message}`);
    }
  }

  async updateMetadata(config: IndexConfig): Promise<void> {
    await this.ensureConnection();

    try {
      const metadata: MetadataEntry = {
        id: 'config', // Set id field
        config,
        lastUpdated: Date.now()
      };

      await this.db!.put('metadata', metadata); // No need to spread, directly use metadata
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to update metadata: ${message}`);
    }
  }

  async getMetadata(): Promise<MetadataEntry | null> {
    await this.ensureConnection();

    try {
      const result = await this.db!.get('metadata', 'config');
      return result || null; // Return `null` if `result` is `undefined`
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to retrieve metadata: ${message}`);
    }
  }

  async clearIndices(): Promise<void> {
    await this.ensureConnection();

    try {
      await this.db!.clear('searchIndices');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to clear indices: ${message}`);
    }
  }

  async deleteIndex(key: string): Promise<void> {
    await this.ensureConnection();

    try {
      await this.db!.delete('searchIndices', key);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to delete index: ${message}`);
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}


export class SearchStorage {
  private db: IDBPDatabase<SearchDBSchema> | null = null;
  private readonly DB_NAME = 'nexus_search_db';
  private readonly DB_VERSION = 1;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Initialize immediately to catch early failures
    this.initPromise = this.initialize();
  }

  async initialize(): Promise<void> {
    if (this.db) return;

    try {
      this.db = await openDB<SearchDBSchema>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
          // Handle version upgrades
          if (!db.objectStoreNames.contains('searchIndices')) {
            const indexStore = db.createObjectStore('searchIndices', { keyPath: 'id' });
            indexStore.createIndex('timestamp', 'timestamp');
          }

          if (!db.objectStoreNames.contains('metadata')) {
            const metaStore = db.createObjectStore('metadata', { keyPath: 'id' });
            metaStore.createIndex('lastUpdated', 'lastUpdated');
          }
        },
        blocked() {
          console.warn('Database upgrade was blocked');
        },
        blocking() {
          console.warn('Current database version is blocking a newer version');
        },
        terminated() {
          console.error('Database connection was terminated');
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Storage initialization failed: ${message}`);
    }
  }

  private async ensureConnection(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
    
    if (!this.db) {
      throw new Error('Database connection not available');
    }
  }

  async storeIndex(key: string, data: any): Promise<void> {
    await this.ensureConnection();
    
    try {
      const entry = {
        id: key,
        data,
        timestamp: Date.now(),
      };

      await this.db!.put('searchIndices', entry);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to store index: ${message}`);
    }
  }

  async getIndex(key: string): Promise<any | null> {
    await this.ensureConnection();
    
    try {
      const entry = await this.db!.get('searchIndices', key);
      return entry?.data || null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to retrieve index: ${message}`);
    }
  }

  async updateMetadata(config: IndexConfig): Promise<void> {
    await this.ensureConnection();
  
    try {
      const metadata: MetadataEntry = {
        id: 'config', // Set id field directly
        config,
        lastUpdated: Date.now()
      };
  
      await this.db!.put('metadata', metadata); // Use metadata directly
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to update metadata: ${message}`);
    }
  }
  

  async getMetadata(): Promise<MetadataEntry | null> {
    await this.ensureConnection();
    
    try {
      const result = await this.db!.get('metadata', 'config');
      return result || null; // Return `null` if `result` is `undefined`
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to retrieve metadata: ${message}`);
    }
  }

  async clearIndices(): Promise<void> {
    await this.ensureConnection();
    
    try {
      await this.db!.clear('searchIndices');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to clear indices: ${message}`);
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
