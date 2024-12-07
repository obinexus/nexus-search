import { DBSchema as IDBSchema } from 'idb';

// Example usage with idb:
/*
import { openDB } from 'idb';

const db = await openDB<SearchDBSchema>('nexus-search-db', 1, {
    upgrade(db) {
        // Create stores with indexes
        const indexStore = db.createObjectStore('searchIndices', { keyPath: 'id' });
        indexStore.createIndex('timestamp', 'timestamp');

        const metaStore = db.createObjectStore('metadata', { keyPath: 'id' });
        metaStore.createIndex('lastUpdated', 'lastUpdated');
    }
});
*/
export interface SearchDBSchema extends IDBSchema {
    searchIndices: {
        key: string;
        value: {
            id: string;
            data: any;
            timestamp: number;
        };
        indexes: {
            'timestamp': number;
        };
    };
    metadata: {
        key: string;
        value: MetadataEntry;
        indexes: {
            'lastUpdated': number;
        };
    };
}

export interface MetadataEntry {
    id: string;
    config: IndexConfig;
    lastUpdated: number;
}
export interface DBSchema {
    // Base schema interface that others will extend
}