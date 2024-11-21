import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { IndexConfig } from '../types';

interface SearchDBSchema extends DBSchema {
  searchIndices: {
    key: string;
    value: {
      id: string;
      data: any;
      timestamp: number;
    };
  };
  metadata: {
    key: string;
    value: MetadataEntry;
  };
}

interface MetadataEntry {
  config: IndexConfig;
  lastUpdated: number;
}

export class SearchStorage {
  private db: IDBPDatabase<SearchDBSchema> | null = null;
  private readonly DB_NAME = 'nexus_search_db';
  private readonly DB_VERSION = 1;

  async initialize(): Promise<void> {
    try {
      this.db = await openDB<SearchDBSchema>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Create stores if they don't exist
          if (!db.objectStoreNames.contains('searchIndices')) {
            db.createObjectStore('searchIndices', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('metadata')) {
            db.createObjectStore('metadata', { keyPath: 'id' });
          }
        },
      });
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      throw new Error('Storage initialization failed');
    }
  }

  async storeIndex(key: string, data: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const entry = {
      id: key,
      data,
      timestamp: Date.now(),
    };

    await this.db.put('searchIndices', entry);
  }

  async getIndex(key: string): Promise<any | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const entry = await this.db.get('searchIndices', key);
    return entry?.data || null;
  }

  async updateMetadata(config: IndexConfig): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const metadata: MetadataEntry = {
      config,
      lastUpdated: Date.now()
    };
    
    await this.db.put('metadata', metadata, 'config');
  }

  async clearIndices(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.clear('searchIndices');
  }


}
