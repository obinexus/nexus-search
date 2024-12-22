/**
 * @obinexuscomputing/nexus-search v0.1.56
 * A high-performance search indexing and query system that uses a trie data structure and BFS/DFS algorithms for fast full-text search with fuzzy matching.
 * @license ISC
 */
import { openDB } from 'idb';

class CacheManager {
    constructor(maxSize = 1000, ttlMinutes = 5, initialStrategy = 'LRU') {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttlMinutes * 60 * 1000;
        this.strategy = initialStrategy;
        this.accessOrder = [];
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
    }
    set(key, data) {
        if (this.cache.size >= this.maxSize) {
            this.evict();
        }
        const entry = {
            data,
            timestamp: Date.now(),
            lastAccessed: Date.now(),
            accessCount: 1
        };
        this.cache.set(key, entry);
        this.updateAccessOrder(key);
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            this.stats.misses++;
            return null;
        }
        if (this.isExpired(entry.timestamp)) {
            this.cache.delete(key);
            this.removeFromAccessOrder(key);
            this.stats.misses++;
            return null;
        }
        entry.lastAccessed = Date.now();
        entry.accessCount++;
        this.updateAccessOrder(key);
        this.stats.hits++;
        return entry.data;
    }
    clear() {
        this.cache.clear();
        this.accessOrder = [];
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
    }
    getStats() {
        return {
            ...this.stats,
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate: this.stats.hits / (this.stats.hits + this.stats.misses),
            strategy: this.strategy
        };
    }
    isExpired(timestamp) {
        return Date.now() - timestamp > this.ttl;
    }
    evict() {
        const keyToEvict = this.strategy === 'LRU'
            ? this.findLRUKey()
            : this.findMRUKey();
        if (keyToEvict) {
            this.cache.delete(keyToEvict);
            this.removeFromAccessOrder(keyToEvict);
            this.stats.evictions++;
        }
    }
    findLRUKey() {
        return this.accessOrder[0] || null;
    }
    findMRUKey() {
        return this.accessOrder[this.accessOrder.length - 1] || null;
    }
    updateAccessOrder(key) {
        this.removeFromAccessOrder(key);
        if (this.strategy === 'LRU') {
            this.accessOrder.push(key); // Most recently used at end
        }
        else {
            this.accessOrder.unshift(key); // Most recently used at start
        }
    }
    removeFromAccessOrder(key) {
        const index = this.accessOrder.indexOf(key);
        if (index !== -1) {
            this.accessOrder.splice(index, 1);
        }
    }
    setStrategy(newStrategy) {
        if (newStrategy === this.strategy)
            return;
        this.strategy = newStrategy;
        const entries = [...this.accessOrder];
        this.accessOrder = [];
        entries.forEach(key => this.updateAccessOrder(key));
    }
    prune() {
        let prunedCount = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (this.isExpired(entry.timestamp)) {
                this.cache.delete(key);
                this.removeFromAccessOrder(key);
                prunedCount++;
            }
        }
        return prunedCount;
    }
    analyze() {
        const totalAccesses = this.stats.hits + this.stats.misses;
        const hitRate = totalAccesses > 0 ? this.stats.hits / totalAccesses : 0;
        let totalAccessCount = 0;
        const accessCounts = new Map();
        for (const [key, entry] of this.cache.entries()) {
            totalAccessCount += entry.accessCount;
            accessCounts.set(key, entry.accessCount);
        }
        const averageAccessCount = this.cache.size > 0
            ? totalAccessCount / this.cache.size
            : 0;
        const mostAccessedKeys = Array.from(accessCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([key, count]) => ({ key, count }));
        return {
            hitRate,
            averageAccessCount,
            mostAccessedKeys
        };
    }
}

class IndexedDB {
    constructor() {
        this.db = null;
        this.DB_NAME = 'nexus_search_db';
        this.DB_VERSION = 1;
        this.initPromise = null;
        this.initPromise = this.initialize();
    }
    async initialize() {
        if (this.db)
            return;
        try {
            this.db = await openDB(this.DB_NAME, this.DB_VERSION, {
                upgrade(db) {
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Storage initialization failed: ${message}`);
        }
    }
    async ensureConnection() {
        if (this.initPromise) {
            await this.initPromise;
        }
        if (!this.db) {
            throw new Error('Database connection not available');
        }
    }
    async storeIndex(key, data) {
        await this.ensureConnection();
        try {
            const entry = {
                id: key,
                data,
                timestamp: Date.now(),
            };
            await this.db.put('searchIndices', entry);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to store index: ${message}`);
        }
    }
    async getIndex(key) {
        var _a;
        await this.ensureConnection();
        try {
            const entry = await this.db.get('searchIndices', key);
            return (_a = entry === null || entry === void 0 ? void 0 : entry.data) !== null && _a !== void 0 ? _a : null;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to retrieve index: ${message}`);
        }
    }
    async updateMetadata(config) {
        await this.ensureConnection();
        try {
            const metadata = {
                id: 'config',
                config,
                lastUpdated: Date.now()
            };
            await this.db.put('metadata', metadata);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to update metadata: ${message}`);
        }
    }
    async getMetadata() {
        await this.ensureConnection();
        try {
            const result = await this.db.get('metadata', 'config');
            return result !== null && result !== void 0 ? result : null;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to retrieve metadata: ${message}`);
        }
    }
    async clearIndices() {
        await this.ensureConnection();
        try {
            await this.db.clear('searchIndices');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to clear indices: ${message}`);
        }
    }
    async deleteIndex(key) {
        await this.ensureConnection();
        try {
            await this.db.delete('searchIndices', key);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to delete index: ${message}`);
        }
    }
    async close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}

class SearchStorage {
    constructor(options = {
        type: 'memory'
    }) {
        this.db = null;
        this.memoryStorage = new Map();
        this.storageType = this.determineStorageType(options);
    }
    determineStorageType(options) {
        // Use memory storage if explicitly specified or if in Node.js environment
        if (options.type === 'memory' || !this.isIndexedDBAvailable()) {
            return 'memory';
        }
        return 'indexeddb';
    }
    isIndexedDBAvailable() {
        try {
            return typeof indexedDB !== 'undefined' && indexedDB !== null;
        }
        catch (_a) {
            return false;
        }
    }
    async initialize() {
        if (this.storageType === 'memory') {
            // No initialization needed for memory storage
            return;
        }
        try {
            this.db = await openDB('nexus-search-db', 1, {
                upgrade(db) {
                    const indexStore = db.createObjectStore('searchIndices', { keyPath: 'id' });
                    indexStore.createIndex('timestamp', 'timestamp');
                    const metaStore = db.createObjectStore('metadata', { keyPath: 'id' });
                    metaStore.createIndex('lastUpdated', 'lastUpdated');
                }
            });
        }
        catch (error) {
            // Fallback to memory storage if IndexedDB fails
            this.storageType = 'memory';
            console.warn('Failed to initialize IndexedDB, falling back to memory storage:', error);
        }
    }
    async storeIndex(name, data) {
        var _a;
        if (this.storageType === 'memory') {
            this.memoryStorage.set(name, data);
            return;
        }
        try {
            await ((_a = this.db) === null || _a === void 0 ? void 0 : _a.put('searchIndices', {
                id: name,
                data,
                timestamp: Date.now()
            }));
        }
        catch (error) {
            console.error('Storage error:', error);
            // Fallback to memory storage
            this.memoryStorage.set(name, data);
        }
    }
    async getIndex(name) {
        var _a;
        if (this.storageType === 'memory') {
            return this.memoryStorage.get(name);
        }
        try {
            const entry = await ((_a = this.db) === null || _a === void 0 ? void 0 : _a.get('searchIndices', name));
            return entry === null || entry === void 0 ? void 0 : entry.data;
        }
        catch (error) {
            console.error('Retrieval error:', error);
            // Fallback to memory storage
            return this.memoryStorage.get(name);
        }
    }
    async clearIndices() {
        var _a;
        if (this.storageType === 'memory') {
            this.memoryStorage.clear();
            return;
        }
        try {
            await ((_a = this.db) === null || _a === void 0 ? void 0 : _a.clear('searchIndices'));
        }
        catch (error) {
            console.error('Clear error:', error);
            this.memoryStorage.clear();
        }
    }
    async close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        this.memoryStorage.clear();
    }
}

function createSearchableFields(document, fields) {
    const searchableFields = {};
    fields.forEach(field => {
        const value = getNestedValue(document.content, field);
        if (value !== undefined) {
            searchableFields[field] = normalizeFieldValue(value);
        }
    });
    return searchableFields;
}
function normalizeFieldValue(value) {
    if (typeof value === 'string') {
        return value.toLowerCase().trim();
    }
    if (Array.isArray(value)) {
        return value.map(v => normalizeFieldValue(v)).join(' ');
    }
    if (typeof value === 'object' && value !== null) {
        return Object.values(value).map(v => normalizeFieldValue(v)).join(' ');
    }
    return String(value);
}
function getNestedValue(obj, path) {
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
        if (current && typeof current === 'object' && !Array.isArray(current) && key in current) {
            current = current[key];
        }
        else {
            return undefined;
        }
    }
    return current;
}
/**
 * Optimizes an array of indexable documents by removing duplicates and sorting them.
 *
 * @template T - The type of the indexable document.
 * @param {T[]} data - The array of indexable documents to be optimized.
 * @returns {OptimizationResult<T>} An object containing the optimized data and statistics about the optimization process.
 *
 * @typedef {Object} OptimizationResult
 * @property {T[]} data - The optimized array of indexable documents.
 * @property {Object} stats - Statistics about the optimization process.
 * @property {number} stats.originalSize - The original size of the data array.
 * @property {number} stats.optimizedSize - The size of the optimized data array.
 * @property {number} stats.compressionRatio - The ratio of the optimized size to the original size.
 */
function optimizeIndex(data) {
    const uniqueData = Array.from(new Set(data.map(item => JSON.stringify(item)))).map(item => JSON.parse(item));
    const sorted = uniqueData.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return {
        data: sorted,
        stats: {
            originalSize: data.length,
            optimizedSize: sorted.length,
            compressionRatio: sorted.length / data.length
        }
    };
}

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
    }
    async measure(name, fn) {
        const start = performance.now();
        try {
            return await fn();
        }
        finally {
            const duration = performance.now() - start;
            this.recordMetric(name, duration);
        }
    }
    recordMetric(name, duration) {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        this.metrics.get(name).push(duration);
    }
    getMetrics() {
        const results = {};
        this.metrics.forEach((durations, name) => {
            results[name] = {
                avg: this.average(durations),
                min: Math.min(...durations),
                max: Math.max(...durations),
                count: durations.length
            };
        });
        return results;
    }
    average(numbers) {
        return numbers.reduce((a, b) => a + b, 0) / numbers.length;
    }
    clear() {
        this.metrics.clear();
    }
}

function validateSearchOptions(options) {
    if (options.maxResults && options.maxResults < 1) {
        throw new Error('maxResults must be greater than 0');
    }
    if (options.threshold && (options.threshold < 0 || options.threshold > 1)) {
        throw new Error('threshold must be between 0 and 1');
    }
    if (options.fields && !Array.isArray(options.fields)) {
        throw new Error('fields must be an array');
    }
}
function validateIndexConfig(config) {
    if (!config.name) {
        throw new Error('Index name is required');
    }
    if (!config.version || typeof config.version !== 'number') {
        throw new Error('Valid version number is required');
    }
    if (!Array.isArray(config.fields) || config.fields.length === 0) {
        throw new Error('At least one field must be specified for indexing');
    }
}
function validateDocument(document, fields) {
    return fields.every(field => {
        const value = getNestedValue(document.content, field);
        return value !== undefined;
    });
}

class DataMapper {
    constructor() {
        this.dataMap = new Map();
    }
    mapData(key, documentId) {
        if (!this.dataMap.has(key)) {
            this.dataMap.set(key, new Set());
        }
        this.dataMap.get(key).add(documentId);
    }
    getDocuments(key) {
        return this.dataMap.get(key) || new Set();
    }
    getAllKeys() {
        return Array.from(this.dataMap.keys());
    }
    removeDocument(documentId) {
        this.dataMap.forEach(value => {
            value.delete(documentId);
        });
    }
    removeKey(key) {
        this.dataMap.delete(key);
    }
    exportState() {
        const serializedMap = {};
        this.dataMap.forEach((value, key) => {
            serializedMap[key] = Array.from(value);
        });
        return serializedMap;
    }
    importState(state) {
        this.dataMap.clear();
        Object.entries(state).forEach(([key, value]) => {
            this.dataMap.set(key, new Set(value));
        });
    }
    clear() {
        this.dataMap.clear();
    }
}

class TrieNode {
    constructor() {
        this.children = new Map();
        this.isEndOfWord = false;
        this.documentRefs = new Set();
        this.weight = 0.0;
    }
}

class TrieSearch {
    constructor() {
        this.root = new TrieNode();
        this.documents = new Map();
        this.documentLinks = new Map();
    }
    insert(text, documentId) {
        if (!text || !documentId)
            return;
        const words = text.toLowerCase().split(/\s+/).filter(Boolean);
        for (const word of words) {
            let current = this.root;
            for (const char of word) {
                if (!current.children.has(char)) {
                    current.children.set(char, new TrieNode());
                }
                current = current.children.get(char);
            }
            current.isEndOfWord = true;
            current.documentRefs.add(documentId);
            current.weight += 1.0;
        }
    }
    search(query, maxResults = 10) {
        if (!query)
            return new Set();
        const results = new Set();
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        for (const word of words) {
            let current = this.root;
            let found = true;
            for (const char of word) {
                if (!current.children.has(char)) {
                    found = false;
                    break;
                }
                current = current.children.get(char);
            }
            if (found && current.isEndOfWord) {
                this.collectDocumentRefs(current, results, maxResults);
            }
        }
        return results;
    }
    remove(documentId) {
        for (const [, node] of this.root.children) {
            this.removeHelper(documentId, node);
        }
        this.documents.delete(documentId);
        this.documentLinks.delete(documentId);
    }
    removeHelper(documentId, node) {
        if (node.documentRefs.has(documentId)) {
            node.documentRefs.delete(documentId);
            node.weight -= 1.0;
        }
        for (const [, child] of node.children) {
            this.removeHelper(documentId, child);
        }
        if (node.children.size === 0 && node.documentRefs.size === 0 && node.weight === 0) {
            node.children.clear();
        }
    }
    linkDocument(documentId, links) {
        this.documentLinks.set(documentId, links);
    }
    getDocumentLinks(documentId) {
        var _a;
        return (_a = this.documentLinks.get(documentId)) !== null && _a !== void 0 ? _a : [];
    }
    removeData(documentId) {
        this.remove(documentId);
    }
    fuzzySearch(query, maxDistance = 2) {
        if (!query)
            return new Set();
        const results = new Set();
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        for (const word of words) {
            this.fuzzySearchHelper(word, this.root, '', maxDistance, results);
        }
        return results;
    }
    collectDocumentRefs(node, results, maxResults) {
        if (node.isEndOfWord) {
            for (const docId of node.documentRefs) {
                if (results.size >= maxResults)
                    return;
                results.add(docId);
            }
        }
        for (const child of node.children.values()) {
            if (results.size >= maxResults)
                return;
            this.collectDocumentRefs(child, results, maxResults);
        }
    }
    fuzzySearchHelper(word, node, currentWord, maxDistance, results) {
        if (maxDistance < 0)
            return;
        if (node.isEndOfWord) {
            const distance = this.calculateLevenshteinDistance(word, currentWord);
            if (distance <= maxDistance) {
                node.documentRefs.forEach(id => results.add(id));
            }
        }
        for (const [char, childNode] of node.children) {
            const newDistance = word[currentWord.length] !== char ? maxDistance - 1 : maxDistance;
            this.fuzzySearchHelper(word, childNode, currentWord + char, newDistance, results);
            if (maxDistance > 0) {
                this.fuzzySearchHelper(word, childNode, currentWord, maxDistance - 1, results);
            }
        }
    }
    calculateLevenshteinDistance(s1, s2) {
        const dp = Array(s1.length + 1).fill(0)
            .map(() => Array(s2.length + 1).fill(0));
        for (let i = 0; i <= s1.length; i++)
            dp[i][0] = i;
        for (let j = 0; j <= s2.length; j++)
            dp[0][j] = j;
        for (let i = 1; i <= s1.length; i++) {
            for (let j = 1; j <= s2.length; j++) {
                dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (s1[i - 1] !== s2[j - 1] ? 1 : 0));
            }
        }
        return dp[s1.length][s2.length];
    }
    exportState() {
        return {
            trie: this.serializeNode(this.root),
            documents: Array.from(this.documents.entries()),
            documentLinks: Array.from(this.documentLinks.entries())
        };
    }
    importState(state) {
        this.root = this.deserializeNode(state.trie);
        this.documents = new Map(state.documents);
        this.documentLinks = new Map(state.documentLinks);
    }
    serializeNode(node) {
        const children = {};
        node.children.forEach((childNode, char) => {
            children[char] = this.serializeNode(childNode);
        });
        return {
            isEndOfWord: node.isEndOfWord,
            documentRefs: Array.from(node.documentRefs),
            weight: node.weight,
            children
        };
    }
    deserializeNode(serialized) {
        var _a;
        const node = new TrieNode();
        node.isEndOfWord = serialized.isEndOfWord;
        node.documentRefs = new Set(serialized.documentRefs);
        node.weight = (_a = serialized.weight) !== null && _a !== void 0 ? _a : 0;
        Object.entries(serialized.children).forEach(([char, childData]) => {
            node.children.set(char, this.deserializeNode(childData));
        });
        return node;
    }
    clear() {
        this.root = new TrieNode();
        this.documents.clear();
        this.documentLinks.clear();
    }
    getSize() {
        return this.documents.size;
    }
}

/**
 * IndexMapper class
 * @description IndexMapper class that indexes documents and performs search operations
 * @class IndexMapper
 * @implements {IndexMapper}
 * @method indexDocument
 * @method search
 *
 */
class IndexMapper {
    constructor() {
        this.dataMapper = new DataMapper();
        this.trieSearch = new TrieSearch();
    }
    indexDocument(document, id, fields) {
        fields.forEach(field => {
            const value = document[field];
            if (typeof value === 'string') {
                const words = this.tokenizeText(value);
                words.forEach(word => {
                    this.trieSearch.insert(word, id);
                    this.dataMapper.mapData(word.toLowerCase(), id);
                });
            }
        });
    }
    search(query, options = {}) {
        const { fuzzy = false, maxResults = 10 } = options;
        const searchTerms = this.tokenizeText(query);
        const documentScores = new Map();
        searchTerms.forEach(term => {
            const documentIds = fuzzy
                ? this.trieSearch.fuzzySearch(term)
                : this.trieSearch.search(term, maxResults);
            documentIds.forEach(id => {
                const current = documentScores.get(id) || { score: 0, matches: new Set() };
                current.score += this.calculateScore(id, term);
                current.matches.add(term);
                documentScores.set(id, current);
            });
        });
        const results = Array.from(documentScores.entries())
            .map(([id, { score, matches }]) => ({
            item: id,
            score: score / searchTerms.length,
            matches: Array.from(matches)
        }))
            .sort((a, b) => b.score - a.score);
        return results.slice(0, maxResults);
    }
    exportState() {
        return {
            trie: this.trieSearch.exportState(),
            dataMap: this.dataMapper.exportState()
        };
    }
    importState(state) {
        if (!state || !state.trie || !state.dataMap) {
            throw new Error('Invalid index state');
        }
        this.trieSearch = new TrieSearch();
        this.trieSearch.importState(state.trie);
        this.dataMapper = new DataMapper();
        this.dataMapper.importState(state.dataMap);
    }
    tokenizeText(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 0);
    }
    calculateScore(documentId, term) {
        const baseScore = this.dataMapper.getDocuments(term.toLowerCase()).has(documentId) ? 1.0 : 0.5;
        return baseScore;
    }
    removeDocument(id) {
        this.trieSearch.remove(id);
        this.dataMapper.removeDocument(id);
    }
    addDocument(id, fields, document) {
        this.indexDocument(document, id, fields);
    }
    updateDocument(document, id, fields) {
        this.removeDocument(id);
        this.indexDocument(document, id, fields);
    }
    clear() {
        this.trieSearch = new TrieSearch();
        this.dataMapper = new DataMapper();
    }
}

class IndexManager {
    constructor(config) {
        this.config = config;
        this.indexMapper = new IndexMapper();
        this.documents = new Map();
    }
    async addDocuments(documents) {
        for (const [index, doc] of documents.entries()) {
            const id = this.generateDocumentId(index);
            // Convert document fields to Record<string, DocumentValue>
            const contentRecord = {};
            for (const field of this.config.fields) {
                if (field in doc) {
                    if (field in doc) {
                        contentRecord[field] = doc[field];
                    }
                }
            }
            // Create searchable document with proper field extraction
            const searchableDoc = {
                id,
                content: createSearchableFields({
                    content: contentRecord,
                    id
                }, this.config.fields),
                metadata: doc.metadata
            };
            // Store original document with ID
            this.documents.set(id, { ...doc, id });
            // Index the document
            try {
                await this.indexMapper.indexDocument(searchableDoc, id, this.config.fields);
            }
            catch (error) {
                console.warn(`Failed to index document ${id}:`, error);
            }
        }
    }
    async search(query, options = {}) {
        var _a, _b;
        if (!query.trim())
            return [];
        try {
            const searchResults = await this.indexMapper.search(query, {
                fuzzy: (_a = options.fuzzy) !== null && _a !== void 0 ? _a : false,
                maxResults: (_b = options.maxResults) !== null && _b !== void 0 ? _b : 10
            });
            return searchResults
                .filter(result => this.documents.has(result.item))
                .map(result => ({
                item: this.documents.get(result.item),
                score: result.score,
                matches: result.matches
            }))
                .filter(result => { var _a; return result.score >= ((_a = options.threshold) !== null && _a !== void 0 ? _a : 0.5); });
        }
        catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }
    exportIndex() {
        return {
            documents: Array.from(this.documents.entries()).map(([key, value]) => ({
                key,
                value: this.serializeDocument(value)
            })),
            indexState: this.indexMapper.exportState(),
            config: this.config
        };
    }
    importIndex(data) {
        if (!this.isValidIndexData(data)) {
            throw new Error('Invalid index data format');
        }
        try {
            const typedData = data;
            this.documents = new Map(typedData.documents.map(item => [item.key, item.value]));
            this.config = typedData.config;
            this.indexMapper = new IndexMapper();
            if (this.isValidIndexState(typedData.indexState)) {
                this.indexMapper.importState({
                    trie: typedData.indexState.trie,
                    dataMap: typedData.indexState.dataMap
                });
            }
            else {
                throw new Error('Invalid index state format');
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to import index: ${message}`);
        }
    }
    async removeDocument(documentId) {
        if (this.documents.has(documentId)) {
            this.documents.delete(documentId);
            await this.indexMapper.removeDocument(documentId);
        }
    }
    async updateDocument(document) {
        const id = document.id;
        if (this.documents.has(id)) {
            this.documents.set(id, document);
            const contentRecord = {};
            for (const field of this.config.fields) {
                if (field in document) {
                    if (field in document) {
                        contentRecord[field] = document[field];
                    }
                }
            }
            const searchableDoc = {
                id,
                content: createSearchableFields({
                    content: contentRecord,
                    id
                }, this.config.fields),
                metadata: document.metadata
            };
            await this.indexMapper.updateDocument(searchableDoc, id, this.config.fields);
        }
    }
    clear() {
        this.documents.clear();
        this.indexMapper = new IndexMapper();
    }
    generateDocumentId(index) {
        return `${this.config.name}-${index}-${Date.now()}`;
    }
    isValidIndexData(data) {
        if (!data || typeof data !== 'object')
            return false;
        const indexData = data;
        return Boolean(indexData.documents &&
            Array.isArray(indexData.documents) &&
            indexData.indexState !== undefined &&
            indexData.config &&
            typeof indexData.config === 'object');
    }
    isValidIndexState(state) {
        return (state !== null &&
            typeof state === 'object' &&
            'trie' in state &&
            'dataMap' in state);
    }
    serializeDocument(doc) {
        return JSON.parse(JSON.stringify(doc));
    }
}

class QueryProcessor {
    constructor() {
        this.STOP_WORDS = new Set([
            'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for',
            'from', 'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on',
            'that', 'the', 'to', 'was', 'were', 'will', 'with'
        ]);
    }
    process(query) {
        const tokens = this.tokenize(query);
        const processedTokens = this.processTokens(tokens);
        return this.optimizeQuery(processedTokens);
    }
    tokenize(query) {
        return query
            .toLowerCase()
            .split(/\s+/)
            .filter(term => term.length > 0)
            .map(term => this.classifyToken(term));
    }
    classifyToken(term) {
        if (term.startsWith('+') || term.startsWith('-')) {
            return { type: 'operator', value: term };
        }
        if (term.includes(':')) {
            return { type: 'modifier', value: term };
        }
        return { type: 'term', value: term };
    }
    processTokens(tokens) {
        return tokens
            .filter(token => token.type !== 'term' || !this.STOP_WORDS.has(token.value))
            .map(token => this.normalizeToken(token));
    }
    normalizeToken(token) {
        if (token.type === 'term') {
            // Basic stemming (could be enhanced with proper stemming algorithm)
            let value = token.value;
            if (value.endsWith('ing'))
                value = value.slice(0, -3);
            if (value.endsWith('s'))
                value = value.slice(0, -1);
            return { ...token, value };
        }
        return token;
    }
    optimizeQuery(tokens) {
        return tokens
            .map(token => token.value)
            .join(' ');
    }
}

/**
 * SearchEngine.ts - Reference Implementation
 *
 * This file contains the complete unoptimized version of the SearchEngine class
 * with all features intact. This version includes:
 * - Full event handling
 * - Debug methods
 * - Storage fallback
 * - Cache management
 * - Document indexing
 * - Search functionality
 */
// Core imports
/**
 * SearchEngine class provides full-text search functionality with:
 * - Document indexing and storage
 * - Search with fuzzy matching
 * - Event handling
 * - Cache management
 * - Debug capabilities
 */
class SearchEngine {
    constructor(config) {
        this.isInitialized = false;
        this.config = config;
        this.indexManager = new IndexManager(config);
        this.queryProcessor = new QueryProcessor();
        this.storage = new SearchStorage(config.storage);
        this.cache = new CacheManager();
        this.eventListeners = new Set();
        this.trie = new TrieSearch();
        this.documents = new Map();
    }
    /**
     * Initializes the search engine and storage
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        try {
            try {
                await this.storage.initialize();
            }
            catch (storageError) {
                this.emitEvent({
                    type: 'storage:error',
                    timestamp: Date.now(),
                    error: storageError instanceof Error ? storageError : new Error(String(storageError))
                });
                this.storage = new SearchStorage({ type: 'memory' });
                await this.storage.initialize();
            }
            await this.loadIndexes();
            this.isInitialized = true;
            this.emitEvent({
                type: 'search:start',
                timestamp: Date.now()
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to initialize search engine: ${errorMessage}`);
        }
    }
    /**
     * Adds documents to the search index
     */
    async addDocuments(documents) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        try {
            this.emitEvent({
                type: 'index:start',
                timestamp: Date.now(),
                data: { documentCount: documents.length }
            });
            for (const doc of documents) {
                const docId = doc.id || this.generateDocumentId();
                this.documents.set(docId, doc);
                const searchableDoc = {
                    id: docId,
                    content: createSearchableFields({
                        content: doc.fields,
                        id: docId
                    }, this.config.fields)
                };
                for (const field of this.config.fields) {
                    if (searchableDoc.content[field]) {
                        const content = String(searchableDoc.content[field]).toLowerCase();
                        const words = content.split(/\s+/).filter(Boolean);
                        for (const word of words) {
                            this.trie.insert(word, docId);
                        }
                    }
                }
            }
            await this.indexManager.addDocuments(documents);
            try {
                await this.storage.storeIndex(this.config.name, this.indexManager.exportIndex());
            }
            catch (storageError) {
                this.emitEvent({
                    type: 'storage:error',
                    timestamp: Date.now(),
                    error: storageError instanceof Error ? storageError : new Error(String(storageError))
                });
            }
            this.cache.clear();
            this.emitEvent({
                type: 'index:complete',
                timestamp: Date.now(),
                data: { documentCount: documents.length }
            });
        }
        catch (error) {
            this.emitEvent({
                type: 'index:error',
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw new Error(`Failed to add documents: ${error}`);
        }
    }
    /**
     * Searches the index for documents matching the query
     */
    async search(query, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        validateSearchOptions(options);
        const searchStartTime = Date.now();
        this.emitEvent({
            type: 'search:start',
            timestamp: searchStartTime,
            data: { query, options }
        });
        const cacheKey = this.generateCacheKey(query, options);
        const cachedResults = this.cache.get(cacheKey);
        if (cachedResults) {
            return cachedResults;
        }
        try {
            const processedQuery = this.queryProcessor.process(query);
            const results = await this.indexManager.search(processedQuery, options);
            this.cache.set(cacheKey, results);
            this.emitEvent({
                type: 'search:complete',
                timestamp: Date.now(),
                data: {
                    query,
                    options,
                    resultCount: results.length,
                    searchTime: Date.now() - searchStartTime
                }
            });
            return results;
        }
        catch (error) {
            this.emitEvent({
                type: 'search:error',
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw new Error(`Search failed: ${error}`);
        }
    }
    async removeDocument(documentId) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        if (!this.documents.has(documentId)) {
            throw new Error(`Document ${documentId} not found`);
        }
        try {
            this.emitEvent({
                type: 'remove:start',
                timestamp: Date.now(),
                data: { documentId }
            });
            this.documents.delete(documentId);
            await this.indexManager.removeDocument(documentId);
            try {
                await this.storage.storeIndex(this.config.name, this.indexManager.exportIndex());
            }
            catch (storageError) {
                this.emitEvent({
                    type: 'storage:error',
                    timestamp: Date.now(),
                    error: storageError instanceof Error ? storageError : new Error(String(storageError))
                });
            }
            this.cache.clear();
            this.emitEvent({
                type: 'remove:complete',
                timestamp: Date.now(),
                data: { documentId }
            });
        }
        catch (error) {
            this.emitEvent({
                type: 'remove:error',
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw new Error(`Failed to remove document: ${error}`);
        }
    }
    async updateDocument(document) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        const documentId = document.id;
        if (!documentId || !this.documents.has(documentId)) {
            throw new Error(`Document ${documentId} not found`);
        }
        try {
            this.emitEvent({
                type: 'update:start',
                timestamp: Date.now(),
                data: { documentId }
            });
            this.documents.set(documentId, document);
            const searchableDoc = {
                id: documentId,
                content: createSearchableFields({
                    content: document.fields,
                    id: documentId
                }, this.config.fields)
            };
            for (const field of this.config.fields) {
                if (searchableDoc.content[field]) {
                    const content = String(searchableDoc.content[field]).toLowerCase();
                    const words = content.split(/\s+/).filter(Boolean);
                    for (const word of words) {
                        this.trie.insert(word, documentId);
                    }
                }
            }
            await this.indexManager.updateDocument(document);
            try {
                await this.storage.storeIndex(this.config.name, this.indexManager.exportIndex());
            }
            catch (storageError) {
                this.emitEvent({
                    type: 'storage:error',
                    timestamp: Date.now(),
                    error: storageError instanceof Error ? storageError : new Error(String(storageError))
                });
            }
            this.cache.clear();
            this.emitEvent({
                type: 'update:complete',
                timestamp: Date.now(),
                data: { documentId }
            });
        }
        catch (error) {
            this.emitEvent({
                type: 'update:error',
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw new Error(`Failed to update document: ${error}`);
        }
    }
    // Event handling methods
    addEventListener(listener) {
        this.eventListeners.add(listener);
    }
    removeEventListener(listener) {
        this.eventListeners.delete(listener);
    }
    emitEvent(event) {
        this.eventListeners.forEach(listener => {
            try {
                listener(event);
            }
            catch (error) {
                console.error('Error in event listener:', error);
            }
        });
    }
    // Utility methods
    async loadIndexes() {
        try {
            const storedIndex = await this.storage.getIndex(this.config.name);
            if (storedIndex) {
                this.indexManager.importIndex(storedIndex);
            }
        }
        catch (error) {
            console.warn('Failed to load stored index, starting fresh:', error);
        }
    }
    generateCacheKey(query, options) {
        return `${this.config.name}-${query}-${JSON.stringify(options)}`;
    }
    generateDocumentId() {
        return `${this.config.name}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }
    // Reset methods
    // private resetTrie(): void {
    //     this.trie = new TrieSearch();
    // }
    // private resetStorage(options: { type: 'memory' }): void {
    //     this.storage = new SearchStorage(options);
    // }
    // Cleanup methods
    async clearIndex() {
        try {
            await this.storage.clearIndices();
        }
        catch (error) {
            console.warn('Failed to clear storage, continuing:', error);
        }
        this.documents.clear();
        this.trie = new TrieSearch();
        this.indexManager.clear();
        this.cache.clear();
    }
    async close() {
        try {
            await this.storage.close();
            this.cache.clear();
            this.documents.clear();
            this.isInitialized = false;
        }
        catch (error) {
            console.warn('Error during close:', error);
        }
    }
    get isReady() {
        return this.isInitialized;
    }
    getAllDocuments() {
        return Array.from(this.documents.values());
    }
    // Debug methods
    getIndexedDocumentCount() {
        return this.documents.size;
    }
    getTrieState() {
        return this.trie.exportState();
    }
}

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
class StorageError extends Error {
    constructor(message) {
        super(message);
        this.name = 'StorageError';
    }
}

var CacheStrategyType;
(function (CacheStrategyType) {
    CacheStrategyType["LRU"] = "LRU";
    CacheStrategyType["MRU"] = "MRU";
})(CacheStrategyType || (CacheStrategyType = {}));

// Core imports
// Constants
const DEFAULT_INDEX_OPTIONS = {
    caseSensitive: false,
    stemming: true,
    stopWords: ['the', 'a', 'an', 'and', 'or', 'but'],
    minWordLength: 2,
    maxWordLength: 50,
    fuzzyThreshold: 0.8
};
const DEFAULT_SEARCH_OPTIONS = {
    fuzzy: false,
    maxResults: 10,
    threshold: 0.5,
    fields: [],
    sortBy: 'score',
    sortOrder: 'desc',
    page: 1,
    pageSize: 10,
    regex: '',
    highlight: false,
    includeMatches: false,
    includeScore: false,
    includeStats: false,
};
// Error classes
class SearchError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SearchError';
    }
}
class IndexError extends Error {
    constructor(message) {
        super(message);
        this.name = 'IndexError';
    }
}
// Type guards
function isSearchOptions(obj) {
    if (!obj || typeof obj !== 'object')
        return false;
    const options = obj;
    return ((typeof options.fuzzy === 'undefined' || typeof options.fuzzy === 'boolean') &&
        (typeof options.maxResults === 'undefined' || typeof options.maxResults === 'number'));
}
function isIndexConfig(obj) {
    if (!obj || typeof obj !== 'object')
        return false;
    const config = obj;
    return Boolean(typeof config.name === 'string' &&
        typeof config.version === 'number' &&
        Array.isArray(config.fields));
}
function isSearchResult(obj) {
    if (!obj || typeof obj !== 'object')
        return false;
    const result = obj;
    return Boolean('item' in result &&
        typeof result.score === 'number' &&
        Array.isArray(result.matches));
}
// Create namespace
const NexusSearchNamespace = {
    DEFAULT_INDEX_OPTIONS,
    DEFAULT_SEARCH_OPTIONS,
    SearchError,
    IndexError,
    SearchEngine,
    IndexManager,
    QueryProcessor,
    TrieNode,
    TrieSearch,
    isSearchOptions,
    isIndexConfig,
    isSearchResult,
};
// Initialize global namespace if in browser environment
if (typeof window !== 'undefined') {
    window.NexusSearch = NexusSearchNamespace;
}
// Export namespace
const NexusSearch = NexusSearchNamespace;

export { CacheManager, CacheStrategyType, DEFAULT_INDEX_OPTIONS, DEFAULT_SEARCH_OPTIONS, DataMapper, IndexError, IndexManager, IndexMapper, IndexedDB, NexusSearch, PerformanceMonitor, QueryProcessor, SearchEngine, SearchError, StorageError, TrieNode, TrieSearch, ValidationError, createSearchableFields, NexusSearch as default, getNestedValue, isIndexConfig, isSearchOptions, isSearchResult, normalizeFieldValue, optimizeIndex, validateDocument, validateIndexConfig, validateSearchOptions };
//# sourceMappingURL=index.js.map
