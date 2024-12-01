/**
 * @obinexuscomputing/nexus-search v1.0.0
 * High-performance search indexing and query system
 * @license MIT
 */
'use strict';

var idb = require('idb');

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

// Type guards
function isSearchOptions(obj) {
    return obj && (typeof obj.fuzzy === 'undefined' || typeof obj.fuzzy === 'boolean') && (typeof obj.maxResults === 'undefined' || typeof obj.maxResults === 'number');
}
function isIndexConfig(obj) {
    return obj &&
        typeof obj.name === 'string' &&
        typeof obj.version === 'number' &&
        Array.isArray(obj.fields);
}
function isSearchResult(obj) {
    return obj &&
        'item' in obj &&
        typeof obj.score === 'number' &&
        Array.isArray(obj.matches);
}
// Utility type functions
function createSearchStats() {
    return {
        totalResults: 0,
        searchTime: 0,
        indexSize: 0,
        queryComplexity: 0
    };
}
function createSearchContext(query, options = {}) {
    return {
        query,
        options,
        startTime: Date.now(),
        results: [],
        stats: createSearchStats()
    };
}
function createTokenInfo(value, type, position) {
    return {
        value,
        type,
        position,
        length: value.length
    };
}
// Default configurations
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
    pageSize: 10
};

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
    clear() {
        this.dataMap.clear();
    }
}

class TrieNode {
    constructor() {
        this.children = new Map();
        this.isEndOfWord = false;
        this.data = new Set();
    }
}

class TrieSearch {
    constructor() {
        this.root = new TrieNode();
    }
    insert(word, documentId) {
        let current = this.root;
        for (const char of word.toLowerCase()) {
            if (!current.children.has(char)) {
                current.children.set(char, new TrieNode());
            }
            current = current.children.get(char);
        }
        current.isEndOfWord = true;
        current.data.add(documentId);
    }
    search(prefix, maxResults = 10) {
        const results = new Set();
        let current = this.root;
        for (const char of prefix.toLowerCase()) {
            if (!current.children.has(char)) {
                return results;
            }
            current = current.children.get(char);
        }
        this.collectIds(current, results, maxResults);
        return results;
    }
    collectIds(node, results, maxResults) {
        if (node.isEndOfWord) {
            for (const id of node.data) {
                if (results.size >= maxResults)
                    return;
                results.add(id);
            }
        }
        for (const child of node.children.values()) {
            if (results.size >= maxResults)
                return;
            this.collectIds(child, results, maxResults);
        }
    }
    fuzzySearch(word, maxDistance = 2) {
        const results = new Set();
        this.fuzzySearchHelper(word.toLowerCase(), this.root, '', maxDistance, results);
        return results;
    }
    fuzzySearchHelper(word, node, currentWord, maxDistance, results) {
        if (maxDistance < 0)
            return;
        if (node.isEndOfWord) {
            const distance = this.levenshteinDistance(word, currentWord);
            if (distance <= maxDistance) {
                node.data.forEach(id => results.add(id));
            }
        }
        for (const [char, childNode] of node.children) {
            this.fuzzySearchHelper(word, childNode, currentWord + char, maxDistance, results);
        }
    }
    levenshteinDistance(s1, s2) {
        const dp = Array(s1.length + 1)
            .fill(0)
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
}

class IndexMapper {
    constructor() {
        this.dataMapper = new DataMapper();
        this.trieSearch = new TrieSearch();
    }
    indexDocument(document, id, fields) {
        fields.forEach(field => {
            const value = document[field];
            if (typeof value === 'string') {
                const words = value.split(/\s+/);
                words.forEach(word => {
                    this.trieSearch.insert(word, id);
                    this.dataMapper.mapData(word.toLowerCase(), id);
                });
            }
        });
    }
    search(query, options = {}) {
        const { fuzzy = false, maxResults = 10 } = options;
        const documentIds = fuzzy
            ? this.trieSearch.fuzzySearch(query)
            : this.trieSearch.search(query, maxResults);
        const results = Array.from(documentIds).map(id => ({
            item: id,
            score: this.calculateScore(id, query),
            matches: [query]
        }));
        return results.slice(0, maxResults);
    }
    calculateScore(documentId, query) {
        // Basic scoring implementation - can be enhanced
        const exactMatch = this.dataMapper.getDocuments(query.toLowerCase()).has(documentId);
        return exactMatch ? 1.0 : 0.5;
    }
}

function createSearchableFields(document, fields) {
    const searchableFields = {};
    fields.forEach(field => {
        const value = getNestedValue(document, field);
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
    return path.split('.').reduce((current, key) => current && current[key] !== undefined ? current[key] : undefined, obj);
}
function optimizeIndex(data) {
    // Remove duplicates
    const uniqueData = Array.from(new Set(data.map(item => JSON.stringify(item)))).map(item => JSON.parse(item));
    // Sort for binary search optimization
    return uniqueData.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

class IndexManager {
    constructor(config) {
        this.config = config;
        this.indexMapper = new IndexMapper();
        this.documents = new Map();
    }
    async addDocuments(documents) {
        documents.forEach((doc, index) => {
            const id = this.generateDocumentId(index);
            this.documents.set(id, doc);
            const searchableFields = createSearchableFields(doc, this.config.fields);
            this.indexMapper.indexDocument(searchableFields, id, this.config.fields);
        });
    }
    async search(query, options) {
        const searchResults = this.indexMapper.search(query, {
            fuzzy: options.fuzzy,
            maxResults: options.maxResults
        });
        return searchResults.map(result => ({
            item: this.documents.get(result.item),
            score: result.score,
            matches: result.matches
        }));
    }
    exportIndex() {
        return {
            documents: Array.from(this.documents.entries()),
            config: this.config
        };
    }
    importIndex(data) {
        this.documents = new Map(data.documents);
        this.config = data.config;
    }
    clear() {
        this.documents.clear();
        this.indexMapper = new IndexMapper();
    }
    generateDocumentId(index) {
        return `${this.config.name}-${index}-${Date.now()}`;
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

class SearchStorage {
    constructor() {
        this.db = null;
        this.DB_NAME = 'nexus_search_db';
        this.DB_VERSION = 1;
    }
    async initialize() {
        try {
            this.db = await idb.openDB(this.DB_NAME, this.DB_VERSION, {
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

class CacheManager {
    constructor(maxSize = 1000, ttlMinutes = 5) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttlMinutes * 60 * 1000;
    }
    set(key, data) {
        if (this.cache.size >= this.maxSize) {
            this.evictOldest();
        }
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
        });
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (this.isExpired(entry.timestamp)) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    isExpired(timestamp) {
        return Date.now() - timestamp > this.ttl;
    }
    evictOldest() {
        let oldestKey = null;
        let oldestTime = Infinity;
        for (const [key, entry] of this.cache.entries()) {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }
    clear() {
        this.cache.clear();
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
        const value = getNestedValue(document, field);
        return value !== undefined;
    });
}

class SearchEngine {
    constructor(config) {
        this.config = config;
        this.indexManager = new IndexManager(config);
        this.queryProcessor = new QueryProcessor();
        this.storage = new SearchStorage();
        this.cache = new CacheManager();
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
        validateSearchOptions(options);
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

exports.DEFAULT_INDEX_OPTIONS = DEFAULT_INDEX_OPTIONS;
exports.DEFAULT_SEARCH_OPTIONS = DEFAULT_SEARCH_OPTIONS;
exports.IndexError = IndexError;
exports.IndexManager = IndexManager;
exports.QueryProcessor = QueryProcessor;
exports.SearchEngine = SearchEngine;
exports.SearchError = SearchError;
exports.StorageError = StorageError;
exports.ValidationError = ValidationError;
exports.createSearchContext = createSearchContext;
exports.createSearchStats = createSearchStats;
exports.createSearchableFields = createSearchableFields;
exports.createTokenInfo = createTokenInfo;
exports.isIndexConfig = isIndexConfig;
exports.isSearchOptions = isSearchOptions;
exports.isSearchResult = isSearchResult;
exports.optimizeIndex = optimizeIndex;
exports.validateDocument = validateDocument;
exports.validateIndexConfig = validateIndexConfig;
exports.validateSearchOptions = validateSearchOptions;
//# sourceMappingURL=index.cjs.js.map
