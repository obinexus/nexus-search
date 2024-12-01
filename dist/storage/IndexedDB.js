"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchStorage = void 0;
const idb_1 = require("idb");
class SearchStorage {
    constructor() {
        this.db = null;
        this.DB_NAME = 'nexus_search_db';
        this.DB_VERSION = 1;
    }
    async initialize() {
        try {
            this.db = await (0, idb_1.openDB)(this.DB_NAME, this.DB_VERSION, {
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
        }
        catch (error) {
            console.error('Failed to initialize IndexedDB:', error);
            throw new Error('Storage initialization failed');
        }
    }
    async storeIndex(key, data) {
        if (!this.db)
            throw new Error('Database not initialized');
        const entry = {
            id: key,
            data,
            timestamp: Date.now(),
        };
        await this.db.put('searchIndices', entry);
    }
    async getIndex(key) {
        if (!this.db)
            throw new Error('Database not initialized');
        const entry = await this.db.get('searchIndices', key);
        return entry?.data || null;
    }
    async updateMetadata(config) {
        if (!this.db)
            throw new Error('Database not initialized');
        const metadata = {
            config,
            lastUpdated: Date.now()
        };
        await this.db.put('metadata', metadata, 'config');
    }
    async clearIndices() {
        if (!this.db)
            throw new Error('Database not initialized');
        await this.db.clear('searchIndices');
    }
}
exports.SearchStorage = SearchStorage;
