import { DBSchema as IDBSchema } from 'idb';
import { IndexConfig } from './compactability';
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
}
