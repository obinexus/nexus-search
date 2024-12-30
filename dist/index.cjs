/**
 * @obinexuscomputing/nexus-search v0.1.56
 * A high-performance search indexing and query system that uses a trie data structure and BFS/DFS algorithms for fast full-text search with fuzzy matching.
 * @license ISC
 */
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var idb = require('idb');

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
    highlight: false,
    // Result customization
    includeMatches: false,
    includeScore: false,
    includeStats: false,
    enableRegex: false,
    maxDistance: 0,
    regex: /./ // Simplified to just RegExp to fix type errors
    ,
    prefixMatch: false,
    minScore: 0,
    includePartial: false,
    caseSensitive: false
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
            this.db = await idb.openDB(this.DB_NAME, this.DB_VERSION, {
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
            this.db = await idb.openDB('nexus-search-db', 1, {
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

/**
 * Enhanced IndexedDocument implementation with proper type handling
 * and versioning support
 */
class IndexedDocument {
    constructor(id, fields, metadata, versions = [], relations = []) {
        this.id = id;
        this.fields = this.normalizeFields(fields);
        this.metadata = this.normalizeMetadata(metadata);
        this.versions = versions;
        this.relations = relations;
        this.content = this.normalizeContent(this.fields.content); // Add this line
    }
    /**
     * Implement required document() method from interface
     */
    document() {
        return this;
    }
    /**
     * Normalize document fields ensuring required fields exist
     */
    normalizeFields(fields) {
        const normalizedFields = {
            ...fields,
            title: fields.title || '',
            author: fields.author || '',
            tags: Array.isArray(fields.tags) ? [...fields.tags] : [],
            version: fields.version || '1.0'
        };
        return normalizedFields;
    }
    normalizeContent(content) {
        if (typeof content === 'string') {
            return { text: content };
        }
        return content || {};
    }
    /**
     * Normalize document metadata with timestamps
     */
    normalizeMetadata(metadata) {
        const now = Date.now();
        return {
            indexed: now,
            lastModified: now,
            ...metadata
        };
    }
    /**
     * Create a deep clone of the document
     */
    clone() {
        return new IndexedDocument(this.id, JSON.parse(JSON.stringify(this.fields)), this.metadata ? { ...this.metadata } : undefined, this.versions.map(v => ({ ...v })), this.relations.map(r => ({ ...r })));
    }
    /**
     * Update document fields and metadata
     */
    update(updates) {
        const updatedFields = { ...this.fields };
        const updatedMetadata = {
            ...this.metadata,
            lastModified: Date.now()
        };
        if (updates.fields) {
            Object.entries(updates.fields).forEach(([key, value]) => {
                if (value !== undefined) {
                    updatedFields[key] = value;
                }
            });
        }
        if (updates.metadata) {
            Object.assign(updatedMetadata, updates.metadata);
        }
        return new IndexedDocument(this.id, updatedFields, updatedMetadata, updates.versions || this.versions, updates.relations || this.relations);
    }
    /**
     * Get a specific field value
     */
    getField(field) {
        return this.fields[field];
    }
    /**
     * Set a specific field value
     */
    setField(field, value) {
        this.fields[field] = value;
        if (this.metadata) {
            this.metadata.lastModified = Date.now();
        }
        if (field === 'content') {
            this.content = value;
        }
    }
    /**
     * Add a new version of the document
     */
    addVersion(version) {
        const nextVersion = this.versions.length + 1;
        this.versions.push({
            ...version,
            version: nextVersion
        });
        this.fields.version = String(nextVersion);
        if (this.metadata) {
            this.metadata.lastModified = Date.now();
        }
    }
    /**
     * Add a relationship to another document
     */
    addRelation(relation) {
        this.relations.push(relation);
        if (this.metadata) {
            this.metadata.lastModified = Date.now();
        }
    }
    /**
     * Convert to plain object representation
     */
    toObject() {
        return {
            id: this.id,
            fields: { ...this.fields },
            metadata: this.metadata ? { ...this.metadata } : undefined,
            versions: this.versions.map(v => ({ ...v })),
            relations: this.relations.map(r => ({ ...r }))
        };
    }
    /**
     * Convert to JSON string
     */
    toJSON() {
        return JSON.stringify(this.toObject());
    }
    /**
     * Create string representation
     */
    toString() {
        return `IndexedDocument(${this.id})`;
    }
    /**
     * Create new document instance
     */
    static create(data) {
        return new IndexedDocument(data.id, data.fields, data.metadata, data.versions, data.relations);
    }
    /**
     * Create from plain object
     */
    static fromObject(obj) {
        return IndexedDocument.create({
            id: obj.id,
            fields: obj.fields,
            metadata: obj.metadata,
            versions: obj.versions || [],
            relations: obj.relations || []
        });
    }
    /**
     * Create from raw data
     */
    static fromRawData(id, content, metadata) {
        const fields = {
            title: "",
            content: typeof content === 'string' ? { text: content } : content,
            author: "",
            tags: [],
            version: "1.0"
        };
        return new IndexedDocument(id, fields, metadata);
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
    constructor(depth = 0) {
        this.children = new Map();
        this.isEndOfWord = false;
        this.documentRefs = new Set();
        this.weight = 0.0;
        this.frequency = 0;
        this.lastAccessed = Date.now();
        this.prefixCount = 0;
        this.depth = depth;
    }
    addChild(char) {
        const child = new TrieNode(this.depth + 1);
        this.children.set(char, child);
        return child;
    }
    getChild(char) {
        return this.children.get(char);
    }
    hasChild(char) {
        return this.children.has(char);
    }
    incrementWeight(value = 1.0) {
        this.weight += value;
        this.frequency++;
        this.lastAccessed = Date.now();
    }
    decrementWeight(value = 1.0) {
        this.weight = Math.max(0, this.weight - value);
        this.frequency = Math.max(0, this.frequency - 1);
    }
    clearChildren() {
        this.children.clear();
        this.documentRefs.clear();
        this.weight = 0;
        this.frequency = 0;
    }
    shouldPrune() {
        return this.children.size === 0 &&
            this.documentRefs.size === 0 &&
            this.weight === 0 &&
            this.frequency === 0;
    }
    getScore() {
        const recency = Math.exp(-(Date.now() - this.lastAccessed) / (24 * 60 * 60 * 1000)); // Decay over 24 hours
        return (this.weight * this.frequency * recency) / (this.depth + 1);
    }
}

class TrieSearch {
    constructor(maxWordLength = 50) {
        this.root = new TrieNode();
        this.documents = new Map();
        this.documentLinks = new Map();
        this.totalDocuments = 0;
        this.maxWordLength = maxWordLength;
    }
    addDocument(document) {
        if (!document.id)
            return;
        this.documents.set(document.id, document);
        this.totalDocuments++;
        // Index all text fields
        Object.values(document.fields).forEach(field => {
            if (typeof field === 'string') {
                this.indexText(field, document.id);
            }
            else if (Array.isArray(field)) {
                field.forEach(item => {
                    if (typeof item === 'string') {
                        this.indexText(item, document.id);
                    }
                });
            }
        });
    }
    indexText(text, documentId) {
        const words = this.tokenize(text);
        const uniqueWords = new Set(words);
        uniqueWords.forEach(word => {
            if (word.length <= this.maxWordLength) {
                this.insertWord(word, documentId);
            }
        });
    }
    insertWord(word, documentId) {
        let current = this.root;
        current.prefixCount++;
        for (const char of word) {
            if (!current.hasChild(char)) {
                current = current.addChild(char);
            }
            else {
                current = current.getChild(char);
            }
            current.prefixCount++;
        }
        current.isEndOfWord = true;
        current.documentRefs.add(documentId);
        current.incrementWeight();
    }
    searchWord(term) {
        return this.search(term);
    }
    search(query, options = {}) {
        const { fuzzy = false, maxDistance = 2, prefixMatch = false, maxResults = 10, minScore = 0.1, caseSensitive = false } = options;
        const words = this.tokenize(query, caseSensitive);
        const results = new Map();
        words.forEach(word => {
            let matches = [];
            if (fuzzy) {
                matches = this.fuzzySearch(word, maxDistance);
            }
            else if (prefixMatch) {
                matches = this.prefixSearch(word);
            }
            else {
                matches = this.exactSearch(word);
            }
            matches.forEach(match => {
                const existing = results.get(match.docId);
                if (!existing || existing.score < match.score) {
                    results.set(match.docId, match);
                }
            });
        });
        return Array.from(results.values())
            .filter(result => result.score >= minScore)
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);
    }
    exactSearch(word) {
        const results = [];
        let current = this.root;
        for (const char of word) {
            if (!current.hasChild(char)) {
                return results;
            }
            current = current.getChild(char);
        }
        if (current.isEndOfWord) {
            current.documentRefs.forEach(docId => {
                results.push({
                    docId,
                    score: this.calculateScore(current, word),
                    term: word,
                    id: "",
                    document: this.documents.get(docId),
                    item: undefined,
                    matches: []
                });
            });
        }
        return results;
    }
    prefixSearch(prefix) {
        const results = [];
        let current = this.root;
        // Navigate to prefix node
        for (const char of prefix) {
            if (!current.hasChild(char)) {
                return results;
            }
            current = current.getChild(char);
        }
        // Collect all words with this prefix
        this.collectWords(current, prefix, results);
        return results;
    }
    serializeState() {
        return {
            trie: this.serializeTrie(this.root),
            documents: Array.from(this.documents.entries()),
            documentLinks: Array.from(this.documentLinks.entries()),
            totalDocuments: this.totalDocuments,
            maxWordLength: this.maxWordLength
        };
    }
    deserializeState(state) {
        this.root = this.deserializeTrie(state.trie);
        this.documents = new Map(state.documents);
        this.documentLinks = new Map(state.documentLinks);
        this.totalDocuments = state.totalDocuments;
        this.maxWordLength = state.maxWordLength;
    }
    serializeTrie(node) {
        const serializedNode = {
            prefixCount: node.prefixCount,
            isEndOfWord: node.isEndOfWord,
            documentRefs: Array.from(node.documentRefs),
            children: {}
        };
        node.children.forEach((child, char) => {
            serializedNode.children[char] = this.serializeTrie(child);
        });
        return serializedNode;
    }
    addData(documentId, content, document) {
        if (!documentId || !content)
            return;
        this.addDocument({
            id: documentId,
            fields: {
                content,
                title: document.fields.title || '',
                author: document.fields.author || '',
                tags: document.fields.tags || [],
                version: document.fields.version || ''
            },
            metadata: document.metadata,
            versions: document.versions || [],
            links: document.links || [],
            ranks: [],
            document: function () {
                throw new Error("Function not implemented.");
            },
            relations: []
        });
    }
    deserializeTrie(data) {
        const node = new TrieNode();
        node.prefixCount = data.prefixCount;
        node.isEndOfWord = data.isEndOfWord;
        node.documentRefs = new Set(data.documentRefs);
        for (const char in data.children) {
            node.children.set(char, this.deserializeTrie(data.children[char]));
        }
        return node;
    }
    collectWords(node, currentWord, results) {
        if (node.isEndOfWord) {
            node.documentRefs.forEach(docId => {
                results.push({
                    docId,
                    score: this.calculateScore(node, currentWord),
                    term: currentWord,
                    id: "",
                    document: this.documents.get(docId),
                    item: undefined,
                    matches: []
                });
            });
        }
        node.children.forEach((child, char) => {
            this.collectWords(child, currentWord + char, results);
        });
    }
    fuzzySearch(word, maxDistance) {
        const results = [];
        const searchState = {
            word,
            maxDistance,
            results
        };
        this.fuzzySearchRecursive(this.root, "", 0, 0, searchState);
        return results;
    }
    fuzzySearchRecursive(node, current, currentDistance, depth, state) {
        if (currentDistance > state.maxDistance)
            return;
        if (node.isEndOfWord) {
            const distance = this.calculateLevenshteinDistance(state.word, current);
            if (distance <= state.maxDistance) {
                node.documentRefs.forEach(docId => {
                    return state.results.push({
                        docId,
                        score: this.calculateFuzzyScore(node, current, distance),
                        term: current,
                        distance,
                        id: "",
                        document: this.documents.get(docId),
                        item: undefined,
                        matches: []
                    });
                });
            }
        }
        node.children.forEach((child, char) => {
            // Try substitution
            const substitutionCost = char !== state.word[depth] ? 1 : 0;
            this.fuzzySearchRecursive(child, current + char, currentDistance + substitutionCost, depth + 1, state);
            // Try insertion
            this.fuzzySearchRecursive(child, current + char, currentDistance + 1, depth, state);
            // Try deletion
            if (depth < state.word.length) {
                this.fuzzySearchRecursive(node, current, currentDistance + 1, depth + 1, state);
            }
        });
    }
    calculateScore(node, term) {
        const tfIdf = (node.frequency / this.totalDocuments) *
            Math.log(this.totalDocuments / node.documentRefs.size);
        const positionBoost = 1 / (node.depth + 1);
        const lengthNorm = 1 / Math.sqrt(term.length);
        return node.getScore() * tfIdf * positionBoost * lengthNorm;
    }
    calculateFuzzyScore(node, term, distance) {
        const exactScore = this.calculateScore(node, term);
        return exactScore * Math.exp(-distance);
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
                const substitutionCost = s1[i - 1] !== s2[j - 1] ? 1 : 0;
                dp[i][j] = Math.min(dp[i - 1][j] + 1, // deletion
                dp[i][j - 1] + 1, // insertion
                dp[i - 1][j - 1] + substitutionCost // substitution
                );
            }
        }
        return dp[s1.length][s2.length];
    }
    tokenize(text, caseSensitive = false) {
        const normalized = caseSensitive ? text : text.toLowerCase();
        return normalized
            .split(/[\s,.!?;:'"()\[\]{}\/\\]+/)
            .filter(word => word.length > 0);
    }
    removeDocument(documentId) {
        // Remove document references and update weights
        this.removeDocumentRefs(this.root, documentId);
        this.documents.delete(documentId);
        this.documentLinks.delete(documentId);
        this.totalDocuments = Math.max(0, this.totalDocuments - 1);
        this.pruneEmptyNodes(this.root);
    }
    removeDocumentRefs(node, documentId) {
        if (node.documentRefs.has(documentId)) {
            node.documentRefs.delete(documentId);
            node.decrementWeight();
            node.prefixCount = Math.max(0, node.prefixCount - 1);
        }
        node.children.forEach(child => {
            this.removeDocumentRefs(child, documentId);
        });
    }
    pruneEmptyNodes(node) {
        // Remove empty child nodes
        node.children.forEach((child, char) => {
            if (this.pruneEmptyNodes(child)) {
                node.children.delete(char);
            }
        });
        return node.shouldPrune();
    }
    getSuggestions(prefix, maxResults = 5) {
        let current = this.root;
        // Navigate to prefix node
        for (const char of prefix) {
            if (!current.hasChild(char)) {
                return [];
            }
            current = current.getChild(char);
        }
        // Collect suggestions
        const suggestions = [];
        this.collectSuggestions(current, prefix, suggestions);
        return suggestions
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults)
            .map(suggestion => suggestion.word);
    }
    collectSuggestions(node, currentWord, suggestions) {
        if (node.isEndOfWord) {
            suggestions.push({
                word: currentWord,
                score: node.getScore()
            });
        }
        node.children.forEach((child, char) => {
            this.collectSuggestions(child, currentWord + char, suggestions);
        });
    }
    clear() {
        this.root = new TrieNode();
        this.documents.clear();
        this.documentLinks.clear();
        this.totalDocuments = 0;
    }
}

/**
 * IndexMapper class
 * Manages document indexing and search operations using trie data structure
 */
class IndexMapper {
    constructor(state) {
        this.dataMapper = new DataMapper();
        if (state === null || state === void 0 ? void 0 : state.dataMap) {
            this.dataMapper.importState(state.dataMap);
        }
        this.trieSearch = new TrieSearch();
        this.documents = new Map();
        this.documentScores = new Map();
    }
    /**
     * Index a document for search operations
     */
    indexDocument(document, id, fields) {
        try {
            // Store the document
            if (document.content) {
                this.documents.set(id, {
                    id,
                    fields: document.content,
                    metadata: document.metadata
                });
            }
            // Index each field
            fields.forEach(field => {
                const value = document.content[field];
                if (value !== undefined && value !== null) {
                    const textValue = this.normalizeValue(value);
                    const words = this.tokenizeText(textValue);
                    words.forEach(word => {
                        if (word) {
                            this.trieSearch.addDocument({
                                id,
                                fields: {
                                    [field]: word,
                                    title: "",
                                    content: {},
                                    author: "",
                                    tags: [],
                                    version: ""
                                },
                                versions: [],
                                relations: [],
                                metadata: {},
                                document: () => {
                                    const doc = this.documents.get(id);
                                    if (!doc) {
                                        throw new Error(`Document with id ${id} not found`);
                                    }
                                    return doc;
                                }
                            });
                            this.dataMapper.mapData(word.toLowerCase(), id);
                        }
                    });
                }
            });
        }
        catch (error) {
            console.error(`Error indexing document ${id}:`, error);
            throw new Error(`Failed to index document: ${error}`);
        }
    }
    /**
     * Search for documents matching the query
     */
    search(query, options = {}) {
        try {
            const { fuzzy = false, maxResults = 10 } = options;
            const searchTerms = this.tokenizeText(query);
            this.documentScores.clear();
            searchTerms.forEach(term => {
                if (!term)
                    return;
                const searchResults = fuzzy
                    ? this.trieSearch.fuzzySearch(term, 2)
                    : this.trieSearch.searchWord(term);
                searchResults.forEach(result => {
                    const docId = result.docId;
                    const current = this.documentScores.get(docId) || {
                        score: 0,
                        matches: new Set()
                    };
                    current.score += this.calculateScore(docId, term);
                    current.matches.add(term);
                    this.documentScores.set(docId, current);
                });
            });
            return Array.from(this.documentScores.entries())
                .map(([docId, { score, matches }]) => {
                var _a;
                return ({
                    id: docId,
                    docId: docId,
                    document: this.documents.get(docId),
                    item: docId,
                    term: query,
                    score: score / searchTerms.length,
                    matches: Array.from(matches),
                    metadata: (_a = this.documents.get(docId)) === null || _a === void 0 ? void 0 : _a.metadata
                });
            })
                .sort((a, b) => b.score - a.score)
                .slice(0, maxResults);
        }
        catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }
    // ... rest of the methods remain the same ...
    normalizeValue(value) {
        if (typeof value === 'string') {
            return value;
        }
        if (Array.isArray(value)) {
            return value.map(v => this.normalizeValue(v)).join(' ');
        }
        if (typeof value === 'object' && value !== null) {
            return Object.values(value).map(v => this.normalizeValue(v)).join(' ');
        }
        return String(value);
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
        const termFrequency = this.calculateTermFrequency(documentId, term);
        return baseScore * (1 + termFrequency);
    }
    calculateTermFrequency(documentId, term) {
        const doc = this.documents.get(documentId);
        if (!doc)
            return 0;
        const content = Object.values(doc.fields).join(' ').toLowerCase();
        const regex = new RegExp(term, 'gi');
        const matches = content.match(regex);
        return matches ? matches.length : 0;
    }
    removeDocument(id) {
        this.trieSearch.removeDocument(id);
        this.dataMapper.removeDocument(id);
        this.documents.delete(id);
        this.documentScores.delete(id);
    }
    addDocument(document, id, fields) {
        this.indexDocument(document, id, fields);
    }
    updateDocument(document, id, fields) {
        this.removeDocument(id);
        this.indexDocument(document, id, fields);
    }
    getDocumentById(id) {
        return this.documents.get(id);
    }
    getAllDocuments() {
        return new Map(this.documents);
    }
    exportState() {
        return {
            trie: this.trieSearch.serializeState(),
            dataMap: this.dataMapper.exportState(),
            documents: Array.from(this.documents.entries())
        };
    }
    importState(state) {
        if (!state || !state.trie || !state.dataMap) {
            throw new Error('Invalid index state');
        }
        this.trieSearch = new TrieSearch();
        this.trieSearch.deserializeState(state.trie);
        const newDataMapper = new DataMapper();
        newDataMapper.importState(state.dataMap);
        this.dataMapper = newDataMapper;
        if (state.documents) {
            this.documents = new Map(state.documents);
        }
    }
    clear() {
        this.trieSearch = new TrieSearch();
        const newDataMapper = new DataMapper();
        this.dataMapper = newDataMapper;
        this.documents.clear();
        this.documentScores.clear();
    }
}

/**
 * Performs an optimized Breadth-First Search traversal with regex matching
 */
function bfsRegexTraversal(root, pattern, maxResults = 10, config = {}) {
    const { maxDepth = 50, timeoutMs = 5000, caseSensitive = false, wholeWord = false } = config;
    const regex = createRegexPattern(pattern, { caseSensitive, wholeWord });
    const results = [];
    const queue = [];
    const visited = new Set();
    const startTime = Date.now();
    queue.push({
        node: root,
        matched: '',
        depth: 0,
        path: []
    });
    while (queue.length > 0 && results.length < maxResults) {
        if (Date.now() - startTime > timeoutMs) {
            console.warn('BFS regex search timeout');
            break;
        }
        const current = queue.shift();
        const { node, matched, depth, path } = current;
        if (depth > maxDepth)
            continue;
        if (regex.test(matched) && node.id && !visited.has(node.id)) {
            results.push({
                id: node.id,
                score: calculateRegexMatchScore(node, matched, regex),
                matches: [matched],
                path: [...path],
                positions: findMatchPositions(matched, regex)
            });
            visited.add(node.id);
        }
        for (const [char, childNode] of node.children.entries()) {
            queue.push({
                node: childNode,
                matched: matched + char,
                depth: depth + 1,
                path: [...path, char]
            });
        }
    }
    return results.sort((a, b) => b.score - a.score);
}
/**
 * Performs an optimized Depth-First Search traversal with regex matching
 */
function dfsRegexTraversal(root, pattern, maxResults = 10, config = {}) {
    const { maxDepth = 50, timeoutMs = 5000, caseSensitive = false, wholeWord = false } = config;
    const regex = createRegexPattern(pattern, { caseSensitive, wholeWord });
    const results = [];
    const visited = new Set();
    const startTime = Date.now();
    function dfs(node, matched, depth, path) {
        if (results.length >= maxResults ||
            depth > maxDepth ||
            Date.now() - startTime > timeoutMs) {
            return;
        }
        if (regex.test(matched) && node.id && !visited.has(node.id)) {
            results.push({
                id: node.id,
                score: calculateRegexMatchScore(node, matched, regex),
                matches: [matched],
                path: [...path],
                positions: findMatchPositions(matched, regex)
            });
            visited.add(node.id);
        }
        for (const [char, childNode] of node.children.entries()) {
            dfs(childNode, matched + char, depth + 1, [...path, char]);
        }
    }
    dfs(root, '', 0, []);
    return results.sort((a, b) => b.score - a.score);
}
/**
 * Helper function to create a properly configured regex pattern
 */
function createRegexPattern(pattern, options) {
    const { caseSensitive = false, wholeWord = false } = options;
    if (pattern instanceof RegExp) {
        const flags = `${caseSensitive ? '' : 'i'}${pattern.global ? 'g' : ''}`;
        return new RegExp(pattern.source, flags);
    }
    let source = pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    if (wholeWord) {
        source = `\\b${source}\\b`;
    }
    return new RegExp(source, caseSensitive ? 'g' : 'ig');
}
/**
 * Calculate a score for regex matches based on various factors
 */
function calculateRegexMatchScore(node, matched, regex) {
    const baseScore = node.score || 1;
    const matches = matched.match(regex) || [];
    const matchCount = matches.length;
    const matchQuality = matches.reduce((sum, match) => sum + match.length, 0) / matched.length;
    const depthPenalty = 1 / (node.depth || 1);
    return baseScore * matchCount * matchQuality * depthPenalty;
}
/**
 * Find all match positions in the text for highlighting
 */
function findMatchPositions(text, regex) {
    const positions = [];
    let match;
    const globalRegex = new RegExp(regex.source, regex.flags + (regex.global ? '' : 'g'));
    while ((match = globalRegex.exec(text)) !== null) {
        positions.push([match.index, match.index + match[0].length]);
    }
    return positions;
}
/**
 * Creates searchable fields from a document based on specified field paths
 */
function createSearchableFields(document, fields) {
    if (!(document === null || document === void 0 ? void 0 : document.content) || !Array.isArray(fields)) {
        return {};
    }
    return fields.reduce((acc, field) => {
        try {
            const value = getNestedValue(document.content, field);
            if (value !== undefined) {
                acc[field] = normalizeFieldValue(value);
            }
        }
        catch (error) {
            console.warn(`Error processing field ${field}:`, error);
        }
        return acc;
    }, {});
}
/**
 * Normalizes field values into searchable strings
 */
function normalizeFieldValue(value) {
    if (value === null || value === undefined) {
        return '';
    }
    try {
        if (typeof value === 'string') {
            return value.toLowerCase().trim();
        }
        if (Array.isArray(value)) {
            return value
                .map(normalizeFieldValue)
                .filter(Boolean)
                .join(' ');
        }
        if (typeof value === 'object') {
            return Object.values(value)
                .map(normalizeFieldValue)
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
 * Retrieves a nested value from an object using dot notation path
 */
function getNestedValue(obj, path) {
    if (!obj || !path) {
        return undefined;
    }
    try {
        return path.split('.').reduce((current, key) => {
            if (current === null || typeof current !== 'object') {
                return undefined;
            }
            if (Array.isArray(current)) {
                const index = parseInt(key, 10);
                return isNaN(index) ? undefined : current[index];
            }
            return current[key];
        }, obj);
    }
    catch (error) {
        console.warn(`Error getting nested value for path ${path}:`, error);
        return undefined;
    }
}
/**
 * Optimizes an array of indexable documents
 */
function optimizeIndex(data) {
    if (!Array.isArray(data)) {
        return {
            data: [],
            stats: { originalSize: 0, optimizedSize: 0, compressionRatio: 1 }
        };
    }
    try {
        const uniqueMap = new Map();
        data.forEach(item => {
            const key = JSON.stringify(sortObjectKeys(item));
            uniqueMap.set(key, item);
        });
        const sorted = Array.from(uniqueMap.values())
            .sort((a, b) => generateSortKey(a).localeCompare(generateSortKey(b)));
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
            data,
            stats: {
                originalSize: data.length,
                optimizedSize: data.length,
                compressionRatio: 1
            }
        };
    }
}
/**
 * Helper function to sort object keys recursively
 */
function sortObjectKeys(obj) {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(sortObjectKeys);
    }
    return Object.keys(obj)
        .sort()
        .reduce((sorted, key) => {
        sorted[key] = sortObjectKeys(obj[key]);
        return sorted;
    }, {});
}
/**
 * Helper function to generate consistent sort keys for documents
 */
function generateSortKey(doc) {
    if (!(doc === null || doc === void 0 ? void 0 : doc.id) || !doc.content) {
        return '';
    }
    try {
        return `${doc.id}:${Object.keys(doc.content).sort().join(',')}`;
    }
    catch (_a) {
        return doc.id;
    }
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
    addDocument(document) {
        const id = document.id || this.generateDocumentId(this.documents.size);
        this.documents.set(id, document);
        const contentRecord = {};
        for (const field of this.config.fields) {
            if (field in document.fields) {
                contentRecord[field] = document.fields[field];
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
        this.indexMapper.indexDocument(searchableDoc, id, this.config.fields);
    }
    getDocument(id) {
        return this.documents.get(id);
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
    async addDocuments(documents) {
        for (const doc of documents) {
            // Use document's existing ID if available, otherwise generate new one
            const id = doc.id || this.generateDocumentId(this.documents.size);
            try {
                // Convert document fields to Record<string, DocumentValue>
                const contentRecord = {};
                for (const field of this.config.fields) {
                    if (field in doc.fields) {
                        contentRecord[field] = doc.fields[field];
                    }
                }
                // Create searchable document
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
                await this.indexMapper.indexDocument(searchableDoc, id, this.config.fields);
            }
            catch (error) {
                console.warn(`Failed to index document ${id}:`, error);
            }
        }
    }
    async updateDocument(document) {
        const id = document.id;
        if (!this.documents.has(id)) {
            throw new Error(`Document ${id} not found`);
        }
        try {
            // Update the document in storage
            this.documents.set(id, document);
            // Convert fields for indexing
            const contentRecord = {};
            for (const field of this.config.fields) {
                if (field in document.fields) {
                    contentRecord[field] = document.fields[field];
                }
            }
            // Create searchable document
            const searchableDoc = {
                id,
                content: createSearchableFields({
                    content: contentRecord,
                    id
                }, this.config.fields),
                metadata: document.metadata
            };
            // Update the index
            await this.indexMapper.updateDocument(searchableDoc, id, this.config.fields);
        }
        catch (error) {
            console.error(`Failed to update document ${id}:`, error);
            throw error;
        }
    }
    async removeDocument(documentId) {
        try {
            if (this.documents.has(documentId)) {
                await this.indexMapper.removeDocument(documentId);
                this.documents.delete(documentId);
            }
        }
        catch (error) {
            console.error(`Failed to remove document ${documentId}:`, error);
            throw error;
        }
    }
    async search(query, options = {}) {
        var _a, _b;
        // Handle null or undefined query
        if (!(query === null || query === void 0 ? void 0 : query.trim()))
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
                    docId: item.id,
                    term: query,
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
    // Helper method for tests to check if a document exists
    hasDocument(id) {
        return this.documents.has(id);
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
        // Extract quoted phrases
        let tempQuery = query;
        // const quotes = new Map<string, string>();
        let quoteMatch;
        const quoteRegex = /"[^"]+"|"[^"]*$/g;
        while ((quoteMatch = quoteRegex.exec(tempQuery)) !== null) {
            const quote = quoteMatch[0];
            tempQuery = tempQuery.replace(quote, ` ${quote} `);
        }
        const tokens = this.tokenize(tempQuery);
        const processedTokens = this.processTokens(tokens);
        return this.optimizeQuery(processedTokens);
    }
    tokenize(query) {
        return query
            .split(/\s+/)
            .filter(term => term.length > 0)
            .map(term => {
            // Preserve quotes as-is
            if (term.startsWith('"') && term.endsWith('"')) {
                return { type: 'term', value: term };
            }
            return this.classifyToken(term.toLowerCase());
        });
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
            .filter(token => {
            if (token.type !== 'term')
                return true;
            if (token.value.startsWith('"'))
                return true;
            return !this.STOP_WORDS.has(token.value);
        })
            .map(token => this.normalizeToken(token));
    }
    normalizeToken(token) {
        if (token.type === 'term' && !token.value.startsWith('"')) {
            let value = token.value;
            // Handle 'ing' ending
            if (value.endsWith('ing')) {
                // Keep root word - remove 'ing' and restore any dropped consonant
                value = value.endsWith('ying') ? value.slice(0, -4) + 'y' :
                    value.endsWith('pping') ? value.slice(0, -4) :
                        value.slice(0, -3);
            }
            // Handle 'ies' plurals
            if (value.endsWith('ies')) {
                value = value.slice(0, -3) + 'y';
            }
            // Handle regular plurals but not words ending in 'ss'
            else if (value.endsWith('s') && !value.endsWith('ss')) {
                value = value.slice(0, -1);
            }
            // Handle 'ed' ending
            if (value.endsWith('ed')) {
                value = value.slice(0, -2);
            }
            return { ...token, value };
        }
        return token;
    }
    optimizeQuery(tokens) {
        return tokens
            .map(token => token.value)
            .join(' ')
            .trim()
            .replace(/\s+/g, ' '); // normalize spaces
    }
}

/**
 * NexusDocumentAdapter provides document management functionality with search engine integration
 */
class NexusDocumentAdapter {
    get id() { return this._id; }
    get fields() { return { ...this._fields }; }
    get metadata() { return { ...this._metadata }; }
    get versions() { return [...this._versions]; }
    get relations() { return [...this._relations]; }
    constructor(doc) {
        this._id = doc.id || this.generateId();
        this._fields = this.normalizeFields(doc.fields, doc.content);
        this._metadata = this.normalizeMetadata(doc.metadata);
        this._versions = doc.versions || [];
        this._relations = doc.relations || [];
    }
    normalizeFields(fields, content) {
        const now = new Date().toISOString();
        return {
            title: (fields === null || fields === void 0 ? void 0 : fields.title) || '',
            content: this.normalizeContent((fields === null || fields === void 0 ? void 0 : fields.content) || content),
            type: (fields === null || fields === void 0 ? void 0 : fields.type) || 'document',
            tags: Array.isArray(fields === null || fields === void 0 ? void 0 : fields.tags) ? [...fields.tags] : [],
            category: (fields === null || fields === void 0 ? void 0 : fields.category) || '',
            author: (fields === null || fields === void 0 ? void 0 : fields.author) || '',
            created: (fields === null || fields === void 0 ? void 0 : fields.created) || now,
            modified: (fields === null || fields === void 0 ? void 0 : fields.modified) || now,
            status: (fields === null || fields === void 0 ? void 0 : fields.status) || 'draft',
            version: (fields === null || fields === void 0 ? void 0 : fields.version) || '1.0',
            locale: (fields === null || fields === void 0 ? void 0 : fields.locale) || '',
        };
    }
    normalizeMetadata(metadata) {
        var _a, _b;
        const now = Date.now();
        return {
            indexed: (_a = metadata === null || metadata === void 0 ? void 0 : metadata.indexed) !== null && _a !== void 0 ? _a : now,
            lastModified: (_b = metadata === null || metadata === void 0 ? void 0 : metadata.lastModified) !== null && _b !== void 0 ? _b : now,
            checksum: metadata === null || metadata === void 0 ? void 0 : metadata.checksum,
            permissions: (metadata === null || metadata === void 0 ? void 0 : metadata.permissions) || [],
            workflow: metadata === null || metadata === void 0 ? void 0 : metadata.workflow,
        };
    }
    normalizeContent(content) {
        if (typeof content === 'string') {
            return { text: content };
        }
        return content || {};
    }
    clone() {
        return new NexusDocumentAdapter({
            id: this._id,
            fields: { ...this._fields },
            metadata: { ...this._metadata },
            versions: [...this._versions],
            relations: [...this._relations]
        });
    }
    update(updates) {
        var _a;
        const newFields = updates.fields ? {
            ...this._fields,
            ...updates.fields,
            modified: new Date().toISOString()
        } : this._fields;
        const newMetadata = updates.metadata ? {
            ...this._metadata,
            ...updates.metadata,
            lastModified: Date.now()
        } : this._metadata;
        const versions = [...this._versions];
        if (((_a = updates.fields) === null || _a === void 0 ? void 0 : _a.content) && updates.fields.content !== this._fields.content) {
            versions.push({
                version: versions.length + 1,
                content: this._fields.content,
                modified: new Date(),
                author: this._fields.author
            });
        }
        return new NexusDocumentAdapter({
            id: this._id,
            fields: newFields,
            metadata: newMetadata,
            versions,
            relations: updates.relations || this._relations
        });
    }
    document() {
        return new IndexedDocument(this._id, this._fields, this._metadata, this._versions, this._relations);
    }
    toObject() {
        return {
            id: this._id,
            fields: this._fields,
            metadata: this._metadata,
            versions: this._versions,
            relations: this._relations,
            document: () => this.document(),
            clone: () => this.clone(),
            update: (updates) => this.update(updates),
            toObject: () => this.toObject()
        };
    }
    static async initialize(config = {}) {
        var _a, _b;
        const defaultConfig = this.getDefaultConfig();
        this.config = {
            ...defaultConfig,
            ...config,
            versioning: {
                enabled: true,
                maxVersions: (_b = (_a = config.versioning) === null || _a === void 0 ? void 0 : _a.maxVersions) !== null && _b !== void 0 ? _b : defaultConfig.versioning.maxVersions
            },
            validation: { ...defaultConfig.validation, ...config.validation }
        };
        this.searchEngine = new SearchEngine({
            name: this.config.name,
            version: this.config.version,
            fields: this.config.fields,
            storage: this.config.storage,
            documentSupport: {
                enabled: true,
                versioning: {
                    enabled: true,
                    maxVersions: this.config.versioning.maxVersions
                },
                validation: this.config.validation
            }
        });
        await this.searchEngine.initialize();
    }
    static getDefaultConfig() {
        return {
            name: 'nexus-document',
            version: 1,
            fields: ['title', 'content', 'type', 'tags', 'category', 'author'],
            storage: { type: 'memory' },
            versioning: {
                enabled: true,
                maxVersions: 10
            },
            validation: {
                required: ['title', 'content'],
                customValidators: {}
            }
        };
    }
    static async search(query, options = {}) {
        const results = await this.searchEngine.search(query, options);
        return results.map(result => ({
            ...result,
            item: new NexusDocumentAdapter(this.convertToNexusDocument(result.item))
        }));
    }
    static convertToNexusDocument(doc) {
        return {
            id: doc.id,
            fields: {
                ...doc.fields,
                type: 'document',
                created: doc.fields.modified || new Date().toISOString(),
                status: 'draft'
            },
            metadata: doc.metadata,
            versions: doc.versions,
            relations: doc.relations
        };
    }
    static async create(options) {
        this.validateDocument(options);
        const doc = new NexusDocumentAdapter({
            fields: {
                title: options.title,
                content: options.content,
                type: options.type,
                tags: options.tags || [],
                category: options.category,
                author: options.author,
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                status: options.status || 'draft',
                version: '1.0',
                locale: options.locale
            },
            metadata: new NexusDocumentAdapter({}).normalizeMetadata(options.metadata)
        });
        await doc.save();
        return doc;
    }
    static async get(id) {
        const doc = await this.searchEngine.getDocument(id);
        if (!doc) {
            throw new Error(`Document ${id} not found`);
        }
        return new NexusDocumentAdapter(this.convertToNexusDocument(doc));
    }
    async save() {
        NexusDocumentAdapter.validateDocument(this._fields);
        await NexusDocumentAdapter.searchEngine.updateDocument(this.document());
    }
    async delete() {
        await NexusDocumentAdapter.searchEngine.removeDocument(this._id);
    }
    generateId() {
        return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }
    static validateDocument(doc) {
        const { required = [], customValidators = {} } = this.config.validation;
        for (const field of required) {
            if (!doc[field]) {
                throw new Error(`Field '${field}' is required`);
            }
        }
        for (const [field, validator] of Object.entries(customValidators)) {
            const value = doc[field];
            if (value !== undefined && !validator(value)) {
                throw new Error(`Validation failed for field '${field}'`);
            }
        }
    }
}

class SearchEngine {
    constructor(config) {
        var _a, _b;
        this.isInitialized = false;
        this.config = config;
        this.indexManager = new IndexManager(config);
        this.queryProcessor = new QueryProcessor();
        this.storage = new SearchStorage(config.storage);
        this.cache = new CacheManager();
        this.eventListeners = new Set();
        this.trie = new TrieSearch();
        this.documents = new Map();
        this.documentSupport = (_b = (_a = config.documentSupport) === null || _a === void 0 ? void 0 : _a.enabled) !== null && _b !== void 0 ? _b : false;
        this.config = config;
        this.indexManager = new IndexManager(config);
        this.queryProcessor = new QueryProcessor();
        this.storage = new SearchStorage(config.storage);
        this.cache = new CacheManager();
        this.eventListeners = new Set();
        this.trie = new TrieSearch();
        this.documents = new Map();
        this.trieRoot = { id: '', value: '', score: 0, children: new Map(), depth: 0 };
    }
    extractRegexMatches(doc, positions, options) {
        const searchFields = options.fields || this.config.fields;
        const matches = new Set();
        for (const field of searchFields) {
            const fieldContent = String(doc.fields[field] || '');
            for (const [start, end] of positions) {
                if (start >= 0 && end <= fieldContent.length) {
                    matches.add(fieldContent.slice(start, end));
                }
            }
        }
        return Array.from(matches);
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
    /**
     * Add documents to the search engine
     */
    async addDocuments(documents) {
        var _a, _b, _c, _d, _e;
        if (!this.isInitialized) {
            await this.initialize();
        }
        try {
            const normalizedDocs = documents.map(doc => this.normalizeDocument(doc));
            if (this.documentSupport && ((_a = this.config.documentSupport) === null || _a === void 0 ? void 0 : _a.validation)) {
                this.validateDocuments(normalizedDocs);
            }
            for (const doc of normalizedDocs) {
                this.documents.set(doc.id, doc);
                // Convert type-specific fields with proper type safety
                const adaptedDoc = new NexusDocumentAdapter({
                    id: doc.id,
                    fields: {
                        ...doc.fields,
                        title: String(doc.fields.title || ''),
                        content: this.normalizeContent(doc.fields.content),
                        author: String(doc.fields.author || ''),
                        type: String(doc.fields.type || 'document'),
                        tags: Array.isArray(doc.fields.tags) ? doc.fields.tags.map(String) : [],
                        category: String(doc.fields.category || ''),
                        created: this.normalizeDate(doc.fields.created) || new Date().toISOString(),
                        modified: this.normalizeDate(doc.fields.modified) || new Date().toISOString(),
                        status: this.normalizeStatus(doc.fields.status) || 'draft',
                        version: String(doc.fields.version || '1.0'),
                        locale: String(doc.fields.locale || '')
                    },
                    metadata: {
                        ...doc.metadata,
                        indexed: (_c = (_b = doc.metadata) === null || _b === void 0 ? void 0 : _b.indexed) !== null && _c !== void 0 ? _c : Date.now(),
                        lastModified: (_e = (_d = doc.metadata) === null || _d === void 0 ? void 0 : _d.lastModified) !== null && _e !== void 0 ? _e : Date.now()
                    },
                    versions: doc.versions,
                    relations: doc.relations
                });
                this.trie.addDocument(adaptedDoc);
                this.indexManager.addDocument(adaptedDoc);
            }
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
            throw error;
        }
    }
    /**
     * Helper method to normalize document content
     */
    normalizeContent(content) {
        if (!content)
            return {};
        if (typeof content === 'string')
            return { text: content };
        if (typeof content === 'object')
            return content;
        return { value: String(content) };
    }
    /**
     * Helper method to normalize date strings
     */
    normalizeDate(date) {
        if (!date)
            return undefined;
        if (date instanceof Date)
            return date.toISOString();
        if (typeof date === 'string')
            return new Date(date).toISOString();
        if (typeof date === 'number')
            return new Date(date).toISOString();
        return undefined;
    }
    /**
     * Helper method to normalize document status
     */
    normalizeStatus(status) {
        if (!status)
            return undefined;
        const statusStr = String(status).toLowerCase();
        switch (statusStr) {
            case 'draft':
            case 'published':
            case 'archived':
                return statusStr;
            case 'active':
                return 'published';
            default:
                return 'draft';
        }
    }
    async updateDocument(document) {
        var _a, _b;
        if (!this.isInitialized) {
            await this.initialize();
        }
        const normalizedDoc = this.normalizeDocument(document);
        await this.handleVersioning(normalizedDoc);
        if (this.documentSupport && ((_b = (_a = this.config.documentSupport) === null || _a === void 0 ? void 0 : _a.versioning) === null || _b === void 0 ? void 0 : _b.enabled)) {
            await this.handleVersioning(normalizedDoc);
        }
        this.documents.set(normalizedDoc.id, normalizedDoc);
        this.trie.addDocument(normalizedDoc);
        await this.indexManager.updateDocument(normalizedDoc);
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
                results = await this.performRegexSearch(query, options);
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
    /**
     * Performs regex-based search using either BFS or DFS traversal
     */
    async performRegexSearch(query, options) {
        var _a, _b, _c, _d;
        const regexConfig = {
            maxDepth: ((_a = options.regexConfig) === null || _a === void 0 ? void 0 : _a.maxDepth) || 50,
            timeoutMs: ((_b = options.regexConfig) === null || _b === void 0 ? void 0 : _b.timeoutMs) || 5000,
            caseSensitive: ((_c = options.regexConfig) === null || _c === void 0 ? void 0 : _c.caseSensitive) || false,
            wholeWord: ((_d = options.regexConfig) === null || _d === void 0 ? void 0 : _d.wholeWord) || false
        };
        const regex = this.createRegexFromOption(options.regex || '');
        // Determine search strategy based on regex complexity
        const regexResults = this.isComplexRegex(regex) ?
            await dfsRegexTraversal(this.trieRoot, regex, options.maxResults || 10, regexConfig) :
            await bfsRegexTraversal(this.trieRoot, regex, options.maxResults || 10, regexConfig);
        // Map regex results to SearchResult format
        return regexResults.map(result => {
            const document = this.documents.get(result.id);
            if (!document) {
                throw new Error(`Document not found for id: ${result.id}`);
            }
            return {
                id: result.id,
                docId: result.id,
                term: result.matches[0] || query, // Use first match or query as term
                score: result.score,
                matches: result.matches,
                document: document,
                item: document,
                metadata: {
                    ...document.metadata,
                    lastAccessed: Date.now()
                }
            };
        }).filter(result => result.score >= (options.minScore || 0));
    }
    async performBasicSearch(searchTerms, options) {
        const results = new Map();
        for (const term of searchTerms) {
            const matches = options.fuzzy ?
                this.trie.fuzzySearch(term, options.maxDistance || 2) :
                this.trie.search(term);
            for (const match of matches) {
                const docId = match.docId;
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
    /**
 * Creates a RegExp object from various input types
 */
    createRegexFromOption(regexOption) {
        if (regexOption instanceof RegExp) {
            return regexOption;
        }
        if (typeof regexOption === 'string') {
            return new RegExp(regexOption);
        }
        if (typeof regexOption === 'object' && regexOption !== null) {
            const pattern = regexOption.pattern;
            const flags = regexOption.flags;
            return new RegExp(pattern || '', flags || '');
        }
        return new RegExp('');
    }
    /**
     * Determines if a regex pattern is complex
     */
    isComplexRegex(regex) {
        const pattern = regex.source;
        return (pattern.includes('{') ||
            pattern.includes('+') ||
            pattern.includes('*') ||
            pattern.includes('?') ||
            pattern.includes('|') ||
            pattern.includes('(?') ||
            pattern.includes('[') ||
            pattern.length > 20 // Additional complexity check based on pattern length
        );
    }
    async processSearchResults(results, options) {
        const processedResults = [];
        for (const result of results) {
            const doc = this.documents.get(result.id);
            if (!doc)
                continue;
            const searchResult = {
                id: result.id,
                docId: result.id,
                item: doc,
                score: result.score ? this.normalizeScore(result.score) : result.score,
                matches: [],
                metadata: {
                    ...doc.metadata,
                    lastAccessed: Date.now()
                },
                document: doc,
                term: 'matched' in result ? String(result.matched) : '',
            };
            if (options.includeMatches) {
                if ('positions' in result) {
                    // Handle regex search results
                    searchResult.matches = this.extractRegexMatches(doc, result.positions, options);
                }
                else {
                    // Handle basic search results
                    searchResult.matches = this.extractMatches(doc, options);
                }
            }
            processedResults.push(searchResult);
        }
        return this.applyPagination(processedResults, options);
    }
    getTrieState() {
        return this.trie.serializeState();
    }
    validateDocuments(documents) {
        var _a;
        if (!((_a = this.config.documentSupport) === null || _a === void 0 ? void 0 : _a.validation))
            return;
        const { required = [], customValidators = {} } = this.config.documentSupport.validation;
        for (const doc of documents) {
            // Check required fields
            for (const field of required) {
                if (!doc.fields[field]) {
                    throw new Error(`Field '${field}' is required for document ${doc.id}`);
                }
            }
            // Run custom validators
            Object.entries(customValidators).forEach(([field, validator]) => {
                const value = doc.fields[field];
                if (value !== undefined && !validator(value)) {
                    throw new Error(`Validation failed for field '${field}' in document ${doc.id}`);
                }
            });
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
            this.trie.removeDocument(documentId);
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
    async loadIndexes() {
        try {
            const storedIndex = await this.storage.getIndex(this.config.name);
            if (storedIndex) {
                this.indexManager.importIndex(storedIndex);
                const indexedDocs = this.indexManager.getAllDocuments();
                for (const doc of indexedDocs) {
                    this.documents.set(doc[1].id, IndexedDocument.fromObject({
                        id: doc[1].id,
                        fields: {
                            title: doc[1].fields.title,
                            content: doc[1].fields.content,
                            author: doc[1].fields.author,
                            tags: doc[1].fields.tags,
                            version: doc[1].fields.version
                        },
                        metadata: doc[1].metadata
                    }));
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
    addEventListener(listener) {
        this.eventListeners.add(listener);
    }
    removeEventListener(listener) {
        this.eventListeners.delete(listener);
    }
    /**
      * Emit search engine events
      */
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
    async handleVersioning(doc) {
        var _a, _b, _c;
        const existingDoc = await this.getDocument(doc.id);
        if (!existingDoc)
            return;
        const maxVersions = (_c = (_b = (_a = this.config.documentSupport) === null || _a === void 0 ? void 0 : _a.versioning) === null || _b === void 0 ? void 0 : _b.maxVersions) !== null && _c !== void 0 ? _c : 10;
        const versions = existingDoc.versions || [];
        if (doc.fields.content !== existingDoc.fields.content) {
            versions.push({
                version: Number(existingDoc.fields.version),
                content: existingDoc.fields.content,
                modified: new Date(existingDoc.fields.modified || Date.now()),
                author: existingDoc.fields.author
            });
            // Keep only the latest versions
            if (versions.length > maxVersions) {
                versions.splice(0, versions.length - maxVersions);
            }
            doc.versions = versions;
            doc.fields.version = String(Number(doc.fields.version) + 1);
        }
    }
    normalizeDocument(doc) {
        var _a, _b;
        if (!this.documentSupport) {
            return doc;
        }
        const normalizedFields = {
            title: doc.fields.title || '',
            content: doc.fields.content,
            author: doc.fields.author || '',
            tags: Array.isArray(doc.fields.tags) ? doc.fields.tags : [],
            version: doc.fields.version || '1.0',
        };
        const normalizedMetadata = {
            indexed: ((_a = doc.metadata) === null || _a === void 0 ? void 0 : _a.indexed) || Date.now(),
            lastModified: ((_b = doc.metadata) === null || _b === void 0 ? void 0 : _b.lastModified) || Date.now(),
        };
        return new IndexedDocument(doc.id, normalizedFields, normalizedMetadata);
    }
    async restoreVersion(id, version) {
        if (!this.documentSupport) {
            throw new Error('Document support is not enabled');
        }
        const doc = await this.getDocument(id);
        if (!doc) {
            throw new Error(`Document ${id} not found`);
        }
        const targetVersion = await this.getDocumentVersion(id, version);
        if (!targetVersion) {
            throw new Error(`Version ${version} not found for document ${id}`);
        }
        const updatedDoc = new IndexedDocument(doc.id, {
            ...doc.fields,
            content: targetVersion.content,
            modified: new Date().toISOString(),
            version: String(Number(doc.fields.version) + 1)
        }, {
            ...doc.metadata,
            lastModified: Date.now()
        });
        await this.updateDocument(updatedDoc);
    }
    // Additional NexusDocument specific methods that are only available when document support is enabled
    async getDocumentVersion(id, version) {
        var _a;
        if (!this.documentSupport) {
            throw new Error('Document support is not enabled');
        }
        const doc = await this.getDocument(id);
        return (_a = doc === null || doc === void 0 ? void 0 : doc.versions) === null || _a === void 0 ? void 0 : _a.find(v => v.version === version);
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
class CacheError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CacheError';
    }
}
class MapperError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MapperError';
    }
}
class PerformanceError extends Error {
    constructor(message) {
        super(message);
        this.name = 'PerformanceError';
    }
}
class ConfigError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ConfigError';
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

exports.CacheStrategyType = void 0;
(function (CacheStrategyType) {
    CacheStrategyType["LRU"] = "LRU";
    CacheStrategyType["MRU"] = "MRU";
})(exports.CacheStrategyType || (exports.CacheStrategyType = {}));

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

exports.CacheError = CacheError;
exports.CacheManager = CacheManager;
exports.ConfigError = ConfigError;
exports.DataMapper = DataMapper;
exports.IndexError = IndexError;
exports.IndexManager = IndexManager;
exports.IndexMapper = IndexMapper;
exports.IndexedDB = IndexedDB;
exports.MapperError = MapperError;
exports.NexusSearch = NexusSearch;
exports.PerformanceError = PerformanceError;
exports.PerformanceMonitor = PerformanceMonitor;
exports.QueryProcessor = QueryProcessor;
exports.SearchEngine = SearchEngine;
exports.SearchError = SearchError;
exports.SearchEventError = SearchEventError;
exports.StorageError = StorageError;
exports.TrieNode = TrieNode;
exports.TrieSearch = TrieSearch;
exports.ValidationError = ValidationError;
exports.createSearchableFields = createSearchableFields;
exports.default = NexusSearch;
exports.getNestedValue = getNestedValue;
exports.isIndexConfig = isIndexConfig;
exports.isSearchOptions = isSearchOptions;
exports.isSearchResult = isSearchResult;
exports.normalizeFieldValue = normalizeFieldValue;
exports.optimizeIndex = optimizeIndex;
exports.validateDocument = validateDocument;
exports.validateIndexConfig = validateIndexConfig;
exports.validateSearchOptions = validateSearchOptions;
//# sourceMappingURL=index.cjs.map
