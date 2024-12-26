/**
 * @obinexuscomputing/nexus-search v0.1.56rc
 * A high-performance search indexing and query system that uses a trie data structure and BFS/DFS algorithms for fast full-text search with fuzzy matching.
 * @license ISC
 */
import { openDB } from 'idb';

const DEFAULT_SEARCH_OPTIONS = {
    // Basic search options
    fuzzy: false,
    fields: [],
    boost: {}, // Empty object to satisfy Required type
    maxResults: 10,
    threshold: 0.5,
    // Sorting and pagination
    sortBy: 'score',
    sortOrder: 'desc',
    page: 1,
    pageSize: 10,
    // Advanced features
    regex: '',
    highlight: false,
    // Result customization
    includeMatches: false,
    includeScore: false,
    includeStats: false
};
const DEFAULT_INDEX_OPTIONS = {
    fields: []
};

class CacheManager {
    getSize() {
        return this.cache.size;
    }
    getStatus() {
        const timestamps = Array.from(this.cache.values()).map(entry => entry.timestamp);
        const now = Date.now();
        // Calculate memory usage estimation
        const memoryBytes = this.calculateMemoryUsage();
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            strategy: this.strategy,
            ttl: this.ttl,
            utilization: this.cache.size / this.maxSize,
            oldestEntryAge: timestamps.length ? now - Math.min(...timestamps) : null,
            newestEntryAge: timestamps.length ? now - Math.max(...timestamps) : null,
            memoryUsage: {
                bytes: memoryBytes,
                formatted: this.formatBytes(memoryBytes)
            }
        };
    }
    calculateMemoryUsage() {
        let totalSize = 0;
        // Estimate size of cache entries
        for (const [key, entry] of this.cache.entries()) {
            // Key size (2 bytes per character in UTF-16)
            totalSize += key.length * 2;
            // Entry overhead (timestamp, lastAccessed, accessCount)
            totalSize += 8 * 3; // 8 bytes per number
            // Estimate size of cached data
            totalSize += this.estimateDataSize(entry.data);
        }
        // Add overhead for Map structure and class properties
        totalSize += 8 * (1 + // maxSize
            1 + // ttl
            1 + // strategy string reference
            this.accessOrder.length + // access order array
            3 // stats object numbers
        );
        return totalSize;
    }
    estimateDataSize(data) {
        let size = 0;
        for (const result of data) {
            // Basic properties
            size += 8; // score (number)
            size += result.matches.join('').length * 2; // matches array strings
            // Estimate item size (conservative estimate)
            size += JSON.stringify(result.item).length * 2;
            // Metadata if present
            if (result.metadata) {
                size += JSON.stringify(result.metadata).length * 2;
            }
        }
        return size;
    }
    formatBytes(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }
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

class IndexedDocument {
    constructor(id, fields, metadata) {
        this.versions = [];
        this.relations = [];
        this.id = id;
        this.fields = this.normalizeFields(fields);
        this.metadata = this.normalizeMetadata(metadata);
    }
    normalizeFields(fields) {
        const normalizedFields = {
            title: "",
            content: "",
            author: "",
            tags: [],
            version: ""
        };
        for (const key in fields) {
            if (fields[key] !== undefined) {
                normalizedFields[key] = fields[key];
            }
        }
        return {
            ...normalizedFields,
            title: fields.title || '',
            content: fields.content || '',
            author: fields.author || '',
            tags: fields.tags || []
        };
    }
    normalizeMetadata(metadata) {
        return {
            indexed: Date.now(),
            lastModified: Date.now(),
            ...metadata
        };
    }
    toObject() {
        return {
            id: this.id,
            fields: {
                ...this.fields,
                tags: [...this.fields.tags]
            },
            metadata: this.metadata ? { ...this.metadata } : undefined,
            versions: [...this.versions],
            relations: [...this.relations],
            content: this.content,
            document: () => this,
            clone: () => this.clone(),
            update: (updates) => this.update(updates)
        };
    }
    clone() {
        return new IndexedDocument(this.id, { ...this.fields, tags: [...this.fields.tags] }, this.metadata ? { ...this.metadata } : undefined);
    }
    update(updates) {
        const updatedFields = {
            ...this.fields
        };
        if (updates.fields) {
            Object.entries(updates.fields).forEach(([key, value]) => {
                if (value !== undefined) {
                    // Type assertion to handle string index signature
                    updatedFields[key] = value;
                }
            });
        }
        return new IndexedDocument(this.id, updatedFields, {
            ...this.metadata,
            ...updates.metadata,
            lastModified: Date.now()
        });
    }
    getField(field) {
        return this.fields[field];
    }
    setField(field, value) {
        this.fields[field] = value;
    }
    document() {
        return this;
    }
    static create(data) {
        return new IndexedDocument(data.id, data.fields, data.metadata);
    }
    static fromObject(obj) {
        return IndexedDocument.create({
            id: obj.id,
            fields: {
                ...obj.fields,
                title: obj.fields.title,
                content: obj.fields.content,
                author: obj.fields.author,
                tags: obj.fields.tags
            },
            metadata: obj.metadata
        });
    }
    toJSON() {
        return {
            id: this.id,
            fields: this.fields,
            metadata: this.metadata,
            versions: this.versions,
            relations: this.relations
        };
    }
    toString() {
        return `IndexedDocument(${this.id})`;
    }
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
    getDocumentById(documentId) {
        const documents = new Set();
        this.dataMap.forEach(value => {
            if (value.has(documentId)) {
                documents.add(documentId);
            }
        });
        return documents;
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
            id: id,
            document: this.dataMapper.getDocumentById(id),
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

/**
 * Creates searchable fields from a document based on specified field paths.
 * Handles nested paths and various value types.
 */
function createSearchableFields(document, fields) {
    if (!document || !document.content || !Array.isArray(fields)) {
        return {};
    }
    const searchableFields = {};
    for (const field of fields) {
        try {
            const value = getNestedValue(document.content, field);
            if (value !== undefined) {
                searchableFields[field] = normalizeFieldValue(value);
            }
        }
        catch (error) {
            console.warn(`Error processing field ${field}:`, error);
        }
    }
    return searchableFields;
}
/**
 * Normalizes field values into searchable strings.
 * Handles various data types and nested structures.
 */
function normalizeFieldValue(value) {
    try {
        if (value === null || value === undefined) {
            return '';
        }
        if (typeof value === 'string') {
            return value.toLowerCase().trim();
        }
        if (Array.isArray(value)) {
            return value
                .map(v => normalizeFieldValue(v))
                .filter(Boolean)
                .join(' ');
        }
        if (typeof value === 'object') {
            return Object.values(value)
                .map(v => normalizeFieldValue(v))
                .filter(Boolean)
                .join(' ');
        }
        return String(value).toLowerCase().trim();
    }
    catch (error) {
        console.warn('Error normalizing field value:', error);
        return '';
    }
}
/**
 * Retrieves a nested value from an object using dot notation path.
 * Handles arrays and nested objects safely.
 */
function getNestedValue(obj, path) {
    if (!obj || !path) {
        return undefined;
    }
    try {
        const keys = path.split('.');
        let current = obj;
        for (const key of keys) {
            if (!current || typeof current !== 'object') {
                return undefined;
            }
            if (Array.isArray(current)) {
                // Handle array indexing
                const index = parseInt(key, 10);
                if (isNaN(index)) {
                    return undefined;
                }
                current = current[index];
            }
            else {
                current = current[key];
            }
        }
        return current;
    }
    catch (error) {
        console.warn(`Error getting nested value for path ${path}:`, error);
        return undefined;
    }
}
/**
 * Optimizes an array of indexable documents by removing duplicates
 * and sorting them efficiently.
 *
 * @template T - The type of the indexable document.
 * @param {T[]} data - Array of indexable documents to optimize.
 * @returns {OptimizationResult<T>} Optimized data and optimization statistics.
 */
function optimizeIndex(data) {
    if (!Array.isArray(data)) {
        return {
            data: [],
            stats: {
                originalSize: 0,
                optimizedSize: 0,
                compressionRatio: 1
            }
        };
    }
    try {
        // Use Map for more efficient duplicate removal
        const uniqueMap = new Map();
        for (const item of data) {
            const key = JSON.stringify(sortObjectKeys(item));
            uniqueMap.set(key, item);
        }
        const sorted = Array.from(uniqueMap.values()).sort((a, b) => {
            const aKey = generateSortKey(a);
            const bKey = generateSortKey(b);
            return aKey.localeCompare(bKey);
        });
        return {
            data: sorted,
            stats: {
                originalSize: data.length,
                optimizedSize: sorted.length,
                compressionRatio: data.length ? sorted.length / data.length : 1
            }
        };
    }
    catch (error) {
        console.warn('Error optimizing index:', error);
        return {
            data: [...data],
            stats: {
                originalSize: data.length,
                optimizedSize: data.length,
                compressionRatio: 1
            }
        };
    }
}
/**
 * Helper function to sort object keys recursively for consistent serialization.
 */
function sortObjectKeys(obj) {
    if (Array.isArray(obj)) {
        return obj.map(sortObjectKeys);
    }
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    return Object.keys(obj)
        .sort()
        .reduce((sorted, key) => {
        sorted[key] = sortObjectKeys(obj[key]);
        return sorted;
    }, {});
}
/**
 * Helper function to generate consistent sort keys for documents.
 */
function generateSortKey(doc) {
    if (!doc.id || !doc.content) {
        return '';
    }
    try {
        return `${doc.id}:${Object.keys(doc.content).sort().join(',')}`;
    }
    catch (_a) {
        return doc.id;
    }
}
/**
 * Performs Breadth-First Search traversal on a trie structure with regex matching.
 * @param root Starting node of the trie
 * @param regex Regular expression to match
 * @param maxResults Maximum number of results to return
 * @returns Array of matching document IDs with their scores
 */
function bfsRegexTraversal(root, regex, maxResults = 10) {
    const results = [];
    const queue = [];
    const visited = new Set();
    // Initialize queue with root node
    queue.push({ node: root, matched: '' });
    while (queue.length > 0 && results.length < maxResults) {
        const { node, matched } = queue.shift();
        // Check if we've found a complete match
        if (regex.test(matched) && node.id && !visited.has(node.id)) {
            results.push({ id: node.id, score: node.score });
            visited.add(node.id);
        }
        // Add children to queue
        for (const [char, childNode] of node.children.entries()) {
            queue.push({
                node: childNode,
                matched: matched + char
            });
        }
    }
    return results.sort((a, b) => b.score - a.score);
}
/**
 * Performs Depth-First Search traversal on a trie structure with regex matching.
 * @param root Starting node of the trie
 * @param regex Regular expression to match
 * @param maxResults Maximum number of results to return
 * @returns Array of matching document IDs with their scores
 */
function dfsRegexTraversal(root, regex, maxResults = 10) {
    const results = [];
    const visited = new Set();
    function dfs(node, matched) {
        if (results.length >= maxResults)
            return;
        // Check if we've found a complete match
        if (regex.test(matched) && node.id && !visited.has(node.id)) {
            results.push({ id: node.id, score: node.score });
            visited.add(node.id);
        }
        // Explore children
        for (const [char, childNode] of node.children.entries()) {
            dfs(childNode, matched + char);
        }
    }
    dfs(root, '');
    return results.sort((a, b) => b.score - a.score);
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

class IndexManager {
    getSize() {
        return this.documents.size;
    }
    getAllDocuments() {
        return this.documents;
    }
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
                .map(result => {
                const item = this.documents.get(result.item);
                return {
                    id: item.id,
                    document: item,
                    metadata: item.metadata,
                    item,
                    score: result.score,
                    matches: result.matches
                };
            })
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
        if (query == null)
            return '';
        if (typeof query !== 'string')
            return String(query);
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
            let value = token.value;
            if (value.endsWith('ing'))
                value = value.slice(0, -3);
            if (value.endsWith('ed'))
                value = value.slice(0, -2);
            if (value.endsWith('s') && !value.endsWith('ss'))
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
        this.trieRoot = { id: '', value: '', score: 0, children: new Map() };
    }
    async initialize() {
        if (this.isInitialized)
            return;
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
                type: 'engine:initialized',
                timestamp: Date.now()
            });
        }
        catch (error) {
            throw new Error(`Failed to initialize search engine: ${String(error)}`);
        }
    }
    async addDocuments(documents) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        this.emitEvent({
            type: 'index:start',
            timestamp: Date.now(),
            data: { documentCount: documents.length }
        });
        try {
            for (const doc of documents) {
                const docId = doc.id || this.generateDocumentId();
                const indexedDoc = new IndexedDocument(docId, doc.fields, {
                    ...doc.metadata,
                    indexed: Date.now(),
                    lastModified: Date.now()
                });
                this.documents.set(docId, indexedDoc);
                const searchableContent = createSearchableFields({ content: indexedDoc.fields, id: docId }, this.config.fields);
                for (const field of this.config.fields) {
                    if (searchableContent[field]) {
                        const words = searchableContent[field]
                            .toLowerCase()
                            .split(/\s+/)
                            .filter(Boolean);
                        for (const word of words) {
                            this.trie.insert(word, docId);
                        }
                    }
                }
            }
            await this.indexManager.addDocuments(documents);
            await this.storage.storeIndex(this.config.name, this.indexManager.exportIndex());
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
            let results;
            if (options.regex) {
                const regex = typeof options.regex === 'string' ?
                    new RegExp(options.regex) : options.regex;
                if (this.isComplexRegex(regex)) {
                    results = dfsRegexTraversal(this.trieRoot, regex, options.maxResults || 10);
                }
                else {
                    results = bfsRegexTraversal(this.trieRoot, regex, options.maxResults || 10);
                }
            }
            else {
                const processedQuery = this.queryProcessor.process(query);
                const searchTerms = processedQuery.toLowerCase().split(/\s+/).filter(Boolean);
                results = await this.performBasicSearch(searchTerms, options);
            }
            const searchResults = await this.processSearchResults(results, options);
            this.cache.set(cacheKey, searchResults);
            this.emitEvent({
                type: 'search:complete',
                timestamp: Date.now(),
                data: {
                    query,
                    options,
                    resultCount: searchResults.length,
                    searchTime: Date.now() - searchStartTime
                }
            });
            return searchResults;
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
    async updateDocument(document) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        const documentId = document.id;
        if (!documentId || !this.documents.has(documentId)) {
            throw new Error(`Document ${documentId} not found`);
        }
        try {
            await this.removeDocument(documentId);
            await this.addDocuments([document]);
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
    async removeDocument(documentId) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        if (!this.documents.has(documentId)) {
            throw new Error(`Document ${documentId} not found`);
        }
        try {
            this.documents.delete(documentId);
            this.trie.removeData(documentId);
            await this.indexManager.removeDocument(documentId);
            this.cache.clear();
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
    async clearIndex() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        try {
            await this.storage.clearIndices();
            this.documents.clear();
            this.trie = new TrieSearch();
            this.indexManager.clear();
            this.cache.clear();
            this.emitEvent({
                type: 'index:clear',
                timestamp: Date.now()
            });
        }
        catch (error) {
            this.emitEvent({
                type: 'index:clear:error',
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw new Error(`Failed to clear index: ${error}`);
        }
    }
    async performBasicSearch(searchTerms, options) {
        const results = new Map();
        for (const term of searchTerms) {
            const matches = options.fuzzy ?
                this.trie.fuzzySearch(term) :
                this.trie.search(term);
            for (const docId of matches) {
                const current = results.get(docId) || { score: 0, matches: new Set() };
                current.score += this.calculateTermScore(term, docId, options);
                current.matches.add(term);
                results.set(docId, current);
            }
        }
        return Array.from(results.entries())
            .map(([id, { score }]) => ({ id, score }))
            .sort((a, b) => b.score - a.score);
    }
    async processSearchResults(results, options) {
        const processedResults = [];
        for (const { id, score } of results) {
            const doc = this.documents.get(id);
            if (!doc)
                continue;
            const searchResult = {
                id,
                item: doc,
                score: this.normalizeScore(score),
                matches: [],
                metadata: {
                    ...doc.metadata,
                    lastAccessed: Date.now()
                },
                document: doc
            };
            if (options.includeMatches) {
                searchResult.matches = this.extractMatches(doc, options);
            }
            processedResults.push(searchResult);
        }
        return this.applyPagination(processedResults, options);
    }
    calculateTermScore(term, docId, options) {
        var _a;
        const doc = this.documents.get(docId);
        if (!doc)
            return 0;
        const searchFields = options.fields || this.config.fields;
        let score = 0;
        for (const field of searchFields) {
            const fieldContent = String(doc.fields[field] || '').toLowerCase();
            const fieldBoost = (((_a = options.boost) === null || _a === void 0 ? void 0 : _a[field]) || 1);
            const termFrequency = (fieldContent.match(new RegExp(term, 'gi')) || []).length;
            score += termFrequency * fieldBoost;
        }
        return score;
    }
    normalizeScore(score) {
        return Math.min(Math.max(score / 100, 0), 1);
    }
    extractMatches(doc, options) {
        const matches = new Set();
        const searchFields = options.fields || this.config.fields;
        for (const field of searchFields) {
            const fieldContent = String(doc.fields[field] || '').toLowerCase();
            if (options.regex) {
                const regex = typeof options.regex === 'string' ?
                    new RegExp(options.regex, 'gi') :
                    new RegExp(options.regex.source, 'gi');
                const fieldMatches = fieldContent.match(regex) || [];
                fieldMatches.forEach(match => matches.add(match));
            }
        }
        return Array.from(matches);
    }
    applyPagination(results, options) {
        const page = options.page || 1;
        const pageSize = options.pageSize || 10;
        const start = (page - 1) * pageSize;
        return results.slice(start, start + pageSize);
    }
    isComplexRegex(regex) {
        const pattern = regex.source;
        return (pattern.includes('{') ||
            pattern.includes('+') ||
            pattern.includes('*') ||
            pattern.includes('?') ||
            pattern.includes('|') ||
            pattern.includes('(?') ||
            pattern.includes('['));
    }
    async loadIndexes() {
        try {
            const storedIndex = await this.storage.getIndex(this.config.name);
            if (storedIndex) {
                this.indexManager.importIndex(storedIndex);
                const indexedDocs = this.indexManager.getAllDocuments();
                for (const doc of indexedDocs) {
                    this.documents.set(doc[1].id, IndexedDocument.fromObject(doc[1]));
                }
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
    async close() {
        try {
            await this.storage.close();
            this.cache.clear();
            this.documents.clear();
            this.isInitialized = false;
            this.emitEvent({
                type: 'engine:closed',
                timestamp: Date.now()
            });
        }
        catch (error) {
            console.warn('Error during close:', error);
        }
    }
    getIndexedDocumentCount() {
        return this.documents.size;
    }
    getTrieState() {
        return this.trie.exportState();
    }
    async bulkUpdate(updates) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        const updatePromises = [];
        for (const [id, update] of updates) {
            const existingDoc = this.documents.get(id);
            if (existingDoc) {
                const updatedDoc = new IndexedDocument(id, { ...existingDoc.fields, ...update.fields }, { ...existingDoc.metadata, ...update.metadata });
                updatePromises.push(this.updateDocument(updatedDoc));
            }
        }
        try {
            await Promise.all(updatePromises);
            this.emitEvent({
                type: 'bulk:update:complete',
                timestamp: Date.now(),
                data: { updateCount: updates.size }
            });
        }
        catch (error) {
            this.emitEvent({
                type: 'bulk:update:error',
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw new Error(`Bulk update failed: ${error}`);
        }
    }
    async importIndex(indexData) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        try {
            await this.clearIndex();
            this.indexManager.importIndex(indexData);
            const indexedDocuments = Array.from(this.documents.values()).map(doc => IndexedDocument.fromObject(doc));
            await this.addDocuments(indexedDocuments);
            this.emitEvent({
                type: 'import:complete',
                timestamp: Date.now(),
                data: { documentCount: this.documents.size }
            });
        }
        catch (error) {
            this.emitEvent({
                type: 'import:error',
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw new Error(`Import failed: ${error}`);
        }
    }
    exportIndex() {
        if (!this.isInitialized) {
            throw new Error('Search engine not initialized');
        }
        return this.indexManager.exportIndex();
    }
    getDocument(id) {
        return this.documents.get(id);
    }
    getAllDocuments() {
        return Array.from(this.documents.values());
    }
    async reindexAll() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        try {
            const documents = this.getAllDocuments();
            await this.clearIndex();
            await this.addDocuments(documents);
            this.emitEvent({
                type: 'reindex:complete',
                timestamp: Date.now(),
                data: { documentCount: documents.length }
            });
        }
        catch (error) {
            this.emitEvent({
                type: 'reindex:error',
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw new Error(`Reindex failed: ${error}`);
        }
    }
    async optimizeIndex() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        try {
            // Trigger cache cleanup
            this.cache.clear();
            // Compact storage if possible
            if (this.storage instanceof SearchStorage) {
                await this.storage.clearIndices();
                await this.storage.storeIndex(this.config.name, this.indexManager.exportIndex());
            }
            this.emitEvent({
                type: 'optimize:complete',
                timestamp: Date.now()
            });
        }
        catch (error) {
            this.emitEvent({
                type: 'optimize:error',
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw new Error(`Optimization failed: ${error}`);
        }
    }
    getStats() {
        return {
            documentCount: this.documents.size,
            indexSize: this.indexManager.getSize(),
            cacheSize: this.cache.getSize(),
            initialized: this.isInitialized
        };
    }
    isReady() {
        return this.isInitialized;
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

class SearchEventError extends Error {
    constructor(message, type, details) {
        super(message);
        this.type = type;
        this.details = details;
        this.name = 'SearchEventError';
    }
}

var CacheStrategyType;
(function (CacheStrategyType) {
    CacheStrategyType["LRU"] = "LRU";
    CacheStrategyType["MRU"] = "MRU";
})(CacheStrategyType || (CacheStrategyType = {}));

// Custom error classes
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
// Type guards with improved type checking
function isSearchOptions(obj) {
    if (!obj || typeof obj !== 'object')
        return false;
    const options = obj;
    return ((typeof options.fuzzy === 'undefined' || typeof options.fuzzy === 'boolean') &&
        (typeof options.maxResults === 'undefined' || typeof options.maxResults === 'number') &&
        (typeof options.threshold === 'undefined' || typeof options.threshold === 'number') &&
        (typeof options.fields === 'undefined' || Array.isArray(options.fields)) &&
        (typeof options.sortBy === 'undefined' || typeof options.sortBy === 'string') &&
        (typeof options.sortOrder === 'undefined' || ['asc', 'desc'].includes(options.sortOrder)) &&
        (typeof options.page === 'undefined' || typeof options.page === 'number') &&
        (typeof options.pageSize === 'undefined' || typeof options.pageSize === 'number') &&
        (typeof options.regex === 'undefined' || typeof options.regex === 'string' || options.regex instanceof RegExp) &&
        (typeof options.boost === 'undefined' || (typeof options.boost === 'object' && options.boost !== null)));
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
    return Boolean('id' in result &&
        'item' in result &&
        'document' in result &&
        typeof result.score === 'number' &&
        Array.isArray(result.matches));
}
// Create namespace with proper type definition
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
// Browser environment check and global initialization
if (typeof window !== 'undefined') {
    window.NexusSearch = NexusSearchNamespace;
}
// Export namespace
const NexusSearch = NexusSearchNamespace;

export { CacheManager, CacheStrategyType, DataMapper, IndexError, IndexManager, IndexMapper, IndexedDB, NexusSearch, PerformanceMonitor, QueryProcessor, SearchEngine, SearchError, SearchEventError, StorageError, TrieNode, TrieSearch, ValidationError, createSearchableFields, NexusSearch as default, getNestedValue, isIndexConfig, isSearchOptions, isSearchResult, normalizeFieldValue, optimizeIndex, validateDocument, validateIndexConfig, validateSearchOptions };
//# sourceMappingURL=index.js.map
