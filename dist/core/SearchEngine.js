"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchEngine = void 0;
const IndexManager_1 = require("./IndexManager");
const QueryProcessor_1 = require("./QueryProcessor");
const IndexedDB_1 = require("../storage/IndexedDB");
const CacheManager_1 = require("../storage/CacheManager");
const ValidationUtils_1 = require("@/utils/ValidationUtils");
class SearchEngine {
    constructor(config) {
        this.config = config;
        this.indexManager = new IndexManager_1.IndexManager(config);
        this.queryProcessor = new QueryProcessor_1.QueryProcessor();
        this.storage = new IndexedDB_1.SearchStorage();
        this.cache = new CacheManager_1.CacheManager();
    }
    async initialize() {
        try {
            await this.storage.initialize();
            await this.loadIndexes();
        }
        catch (error) {
            throw new Error(`Failed to initialize search engine: ${error}`);
        }
    }
    async addDocuments(documents) {
        try {
            await this.indexManager.addDocuments(documents);
            await this.storage.storeIndex(this.config.name, this.indexManager.exportIndex());
        }
        catch (error) {
            throw new Error(`Failed to add documents: ${error}`);
        }
    }
    async search(query, options = {}) {
        (0, ValidationUtils_1.validateSearchOptions)(options);
        const cacheKey = this.generateCacheKey(query, options);
        const cachedResults = this.cache.get(cacheKey);
        if (cachedResults) {
            return cachedResults;
        }
        const processedQuery = this.queryProcessor.process(query);
        const results = await this.indexManager.search(processedQuery, options);
        this.cache.set(cacheKey, results);
        return results;
    }
    async loadIndexes() {
        const storedIndex = await this.storage.getIndex(this.config.name);
        if (storedIndex) {
            this.indexManager.importIndex(storedIndex);
        }
    }
    generateCacheKey(query, options) {
        return `${query}-${JSON.stringify(options)}`;
    }
    async clearIndex() {
        await this.storage.clearIndices();
        this.indexManager.clear();
        this.cache.clear();
    }
}
exports.SearchEngine = SearchEngine;
