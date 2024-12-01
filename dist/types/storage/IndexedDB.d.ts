import { IndexConfig } from '../types';
export declare class SearchStorage {
    private db;
    private readonly DB_NAME;
    private readonly DB_VERSION;
    initialize(): Promise<void>;
    storeIndex(key: string, data: any): Promise<void>;
    getIndex(key: string): Promise<any | null>;
    updateMetadata(config: IndexConfig): Promise<void>;
    clearIndices(): Promise<void>;
}
