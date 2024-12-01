/**
 * @obinexuscomputing/nexus-search v0.2.1
 * High-performance search indexing and query system
 * @license MIT
 */
'use strict';

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
    exportState() {
        return this.serializeNode(this.root);
    }
    importState(state) {
        this.root = this.deserializeNode(state);
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
    serializeNode(node) {
        const children = {};
        node.children.forEach((childNode, char) => {
            children[char] = this.serializeNode(childNode);
        });
        return {
            isEndOfWord: node.isEndOfWord,
            data: Array.from(node.data),
            children
        };
    }
    deserializeNode(serialized) {
        const node = new TrieNode();
        node.isEndOfWord = serialized.isEndOfWord;
        node.data = new Set(serialized.data);
        Object.entries(serialized.children).forEach(([char, childData]) => {
            node.children.set(char, this.deserializeNode(childData));
        });
        return node;
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
    clear() {
        this.trieSearch = new TrieSearch();
        this.dataMapper = new DataMapper();
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
        // Convert Map to a serializable format and include indexMapper state
        return {
            documents: Array.from(this.documents.entries()).map(([key, value]) => ({
                key,
                value: JSON.parse(JSON.stringify(value)) // Handle potential proxy objects
            })),
            indexState: this.indexMapper.exportState(),
            config: JSON.parse(JSON.stringify(this.config)) // Ensure config is serializable
        };
    }
    importIndex(data) {
        if (!data || !data.documents || !data.indexState || !data.config) {
            throw new Error('Invalid index data format');
        }
        try {
            // Restore documents
            this.documents = new Map(data.documents.map((item) => [item.key, item.value]));
            // Restore config
            this.config = data.config;
            // Restore index mapper state
            this.indexMapper = new IndexMapper();
            this.indexMapper.importState(data.indexState);
        }
        catch (error) {
            throw new Error(`Failed to import index: ${error}`);
        }
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

const instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);

let idbProxyableTypes;
let cursorAdvanceMethods;
// This is a function to prevent it throwing up in node environments.
function getIdbProxyableTypes() {
    return (idbProxyableTypes ||
        (idbProxyableTypes = [
            IDBDatabase,
            IDBObjectStore,
            IDBIndex,
            IDBCursor,
            IDBTransaction,
        ]));
}
// This is a function to prevent it throwing up in node environments.
function getCursorAdvanceMethods() {
    return (cursorAdvanceMethods ||
        (cursorAdvanceMethods = [
            IDBCursor.prototype.advance,
            IDBCursor.prototype.continue,
            IDBCursor.prototype.continuePrimaryKey,
        ]));
}
const cursorRequestMap = new WeakMap();
const transactionDoneMap = new WeakMap();
const transactionStoreNamesMap = new WeakMap();
const transformCache = new WeakMap();
const reverseTransformCache = new WeakMap();
function promisifyRequest(request) {
    const promise = new Promise((resolve, reject) => {
        const unlisten = () => {
            request.removeEventListener('success', success);
            request.removeEventListener('error', error);
        };
        const success = () => {
            resolve(wrap(request.result));
            unlisten();
        };
        const error = () => {
            reject(request.error);
            unlisten();
        };
        request.addEventListener('success', success);
        request.addEventListener('error', error);
    });
    promise
        .then((value) => {
        // Since cursoring reuses the IDBRequest (*sigh*), we cache it for later retrieval
        // (see wrapFunction).
        if (value instanceof IDBCursor) {
            cursorRequestMap.set(value, request);
        }
        // Catching to avoid "Uncaught Promise exceptions"
    })
        .catch(() => { });
    // This mapping exists in reverseTransformCache but doesn't doesn't exist in transformCache. This
    // is because we create many promises from a single IDBRequest.
    reverseTransformCache.set(promise, request);
    return promise;
}
function cacheDonePromiseForTransaction(tx) {
    // Early bail if we've already created a done promise for this transaction.
    if (transactionDoneMap.has(tx))
        return;
    const done = new Promise((resolve, reject) => {
        const unlisten = () => {
            tx.removeEventListener('complete', complete);
            tx.removeEventListener('error', error);
            tx.removeEventListener('abort', error);
        };
        const complete = () => {
            resolve();
            unlisten();
        };
        const error = () => {
            reject(tx.error || new DOMException('AbortError', 'AbortError'));
            unlisten();
        };
        tx.addEventListener('complete', complete);
        tx.addEventListener('error', error);
        tx.addEventListener('abort', error);
    });
    // Cache it for later retrieval.
    transactionDoneMap.set(tx, done);
}
let idbProxyTraps = {
    get(target, prop, receiver) {
        if (target instanceof IDBTransaction) {
            // Special handling for transaction.done.
            if (prop === 'done')
                return transactionDoneMap.get(target);
            // Polyfill for objectStoreNames because of Edge.
            if (prop === 'objectStoreNames') {
                return target.objectStoreNames || transactionStoreNamesMap.get(target);
            }
            // Make tx.store return the only store in the transaction, or undefined if there are many.
            if (prop === 'store') {
                return receiver.objectStoreNames[1]
                    ? undefined
                    : receiver.objectStore(receiver.objectStoreNames[0]);
            }
        }
        // Else transform whatever we get back.
        return wrap(target[prop]);
    },
    set(target, prop, value) {
        target[prop] = value;
        return true;
    },
    has(target, prop) {
        if (target instanceof IDBTransaction &&
            (prop === 'done' || prop === 'store')) {
            return true;
        }
        return prop in target;
    },
};
function replaceTraps(callback) {
    idbProxyTraps = callback(idbProxyTraps);
}
function wrapFunction(func) {
    // Due to expected object equality (which is enforced by the caching in `wrap`), we
    // only create one new func per func.
    // Edge doesn't support objectStoreNames (booo), so we polyfill it here.
    if (func === IDBDatabase.prototype.transaction &&
        !('objectStoreNames' in IDBTransaction.prototype)) {
        return function (storeNames, ...args) {
            const tx = func.call(unwrap(this), storeNames, ...args);
            transactionStoreNamesMap.set(tx, storeNames.sort ? storeNames.sort() : [storeNames]);
            return wrap(tx);
        };
    }
    // Cursor methods are special, as the behaviour is a little more different to standard IDB. In
    // IDB, you advance the cursor and wait for a new 'success' on the IDBRequest that gave you the
    // cursor. It's kinda like a promise that can resolve with many values. That doesn't make sense
    // with real promises, so each advance methods returns a new promise for the cursor object, or
    // undefined if the end of the cursor has been reached.
    if (getCursorAdvanceMethods().includes(func)) {
        return function (...args) {
            // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
            // the original object.
            func.apply(unwrap(this), args);
            return wrap(cursorRequestMap.get(this));
        };
    }
    return function (...args) {
        // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
        // the original object.
        return wrap(func.apply(unwrap(this), args));
    };
}
function transformCachableValue(value) {
    if (typeof value === 'function')
        return wrapFunction(value);
    // This doesn't return, it just creates a 'done' promise for the transaction,
    // which is later returned for transaction.done (see idbObjectHandler).
    if (value instanceof IDBTransaction)
        cacheDonePromiseForTransaction(value);
    if (instanceOfAny(value, getIdbProxyableTypes()))
        return new Proxy(value, idbProxyTraps);
    // Return the same value back if we're not going to transform it.
    return value;
}
function wrap(value) {
    // We sometimes generate multiple promises from a single IDBRequest (eg when cursoring), because
    // IDB is weird and a single IDBRequest can yield many responses, so these can't be cached.
    if (value instanceof IDBRequest)
        return promisifyRequest(value);
    // If we've already transformed this value before, reuse the transformed value.
    // This is faster, but it also provides object equality.
    if (transformCache.has(value))
        return transformCache.get(value);
    const newValue = transformCachableValue(value);
    // Not all types are transformed.
    // These may be primitive types, so they can't be WeakMap keys.
    if (newValue !== value) {
        transformCache.set(value, newValue);
        reverseTransformCache.set(newValue, value);
    }
    return newValue;
}
const unwrap = (value) => reverseTransformCache.get(value);

/**
 * Open a database.
 *
 * @param name Name of the database.
 * @param version Schema version.
 * @param callbacks Additional callbacks.
 */
function openDB(name, version, { blocked, upgrade, blocking, terminated } = {}) {
    const request = indexedDB.open(name, version);
    const openPromise = wrap(request);
    if (upgrade) {
        request.addEventListener('upgradeneeded', (event) => {
            upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction), event);
        });
    }
    if (blocked) {
        request.addEventListener('blocked', (event) => blocked(
        // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
        event.oldVersion, event.newVersion, event));
    }
    openPromise
        .then((db) => {
        if (terminated)
            db.addEventListener('close', () => terminated());
        if (blocking) {
            db.addEventListener('versionchange', (event) => blocking(event.oldVersion, event.newVersion, event));
        }
    })
        .catch(() => { });
    return openPromise;
}

const readMethods = ['get', 'getKey', 'getAll', 'getAllKeys', 'count'];
const writeMethods = ['put', 'add', 'delete', 'clear'];
const cachedMethods = new Map();
function getMethod(target, prop) {
    if (!(target instanceof IDBDatabase &&
        !(prop in target) &&
        typeof prop === 'string')) {
        return;
    }
    if (cachedMethods.get(prop))
        return cachedMethods.get(prop);
    const targetFuncName = prop.replace(/FromIndex$/, '');
    const useIndex = prop !== targetFuncName;
    const isWrite = writeMethods.includes(targetFuncName);
    if (
    // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
    !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) ||
        !(isWrite || readMethods.includes(targetFuncName))) {
        return;
    }
    const method = async function (storeName, ...args) {
        // isWrite ? 'readwrite' : undefined gzipps better, but fails in Edge :(
        const tx = this.transaction(storeName, isWrite ? 'readwrite' : 'readonly');
        let target = tx.store;
        if (useIndex)
            target = target.index(args.shift());
        // Must reject if op rejects.
        // If it's a write operation, must reject if tx.done rejects.
        // Must reject with op rejection first.
        // Must resolve with op value.
        // Must handle both promises (no unhandled rejections)
        return (await Promise.all([
            target[targetFuncName](...args),
            isWrite && tx.done,
        ]))[0];
    };
    cachedMethods.set(prop, method);
    return method;
}
replaceTraps((oldTraps) => ({
    ...oldTraps,
    get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
    has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop),
}));

class IndexedDB {
    constructor() {
        this.db = null;
        this.DB_NAME = 'nexus_search_db';
        this.DB_VERSION = 1;
        this.initPromise = null;
        // Initialize immediately to catch early failures
        this.initPromise = this.initialize();
    }
    async initialize() {
        if (this.db)
            return;
        try {
            this.db = await openDB(this.DB_NAME, this.DB_VERSION, {
                upgrade(db, oldVersion, newVersion, transaction) {
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
        await this.ensureConnection();
        try {
            const entry = await this.db.get('searchIndices', key);
            return entry?.data || null;
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
                id: 'config', // Set id field
                config,
                lastUpdated: Date.now()
            };
            await this.db.put('metadata', metadata); // No need to spread, directly use metadata
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
            return result || null; // Return `null` if `result` is `undefined`
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
    constructor() {
        this.db = null;
        this.DB_NAME = 'nexus_search_db';
        this.DB_VERSION = 1;
        this.initPromise = null;
        // Initialize immediately to catch early failures
        this.initPromise = this.initialize();
    }
    async initialize() {
        if (this.db)
            return;
        try {
            this.db = await openDB(this.DB_NAME, this.DB_VERSION, {
                upgrade(db, oldVersion, newVersion, transaction) {
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
        await this.ensureConnection();
        try {
            const entry = await this.db.get('searchIndices', key);
            return entry?.data || null;
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
                id: 'config', // Set id field directly
                config,
                lastUpdated: Date.now()
            };
            await this.db.put('metadata', metadata); // Use metadata directly
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
            return result || null; // Return `null` if `result` is `undefined`
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
    async close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
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
                count: durations.length,
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

exports.CacheManager = CacheManager;
exports.DEFAULT_INDEX_OPTIONS = DEFAULT_INDEX_OPTIONS;
exports.DEFAULT_SEARCH_OPTIONS = DEFAULT_SEARCH_OPTIONS;
exports.DataMapper = DataMapper;
exports.IndexError = IndexError;
exports.IndexManager = IndexManager;
exports.IndexMapper = IndexMapper;
exports.IndexedDB = IndexedDB;
exports.PerformanceMonitor = PerformanceMonitor;
exports.QueryProcessor = QueryProcessor;
exports.SearchEngine = SearchEngine;
exports.SearchError = SearchError;
exports.StorageError = StorageError;
exports.TrieNode = TrieNode;
exports.TrieSearch = TrieSearch;
exports.ValidationError = ValidationError;
exports.createSearchContext = createSearchContext;
exports.createSearchStats = createSearchStats;
exports.createSearchableFields = createSearchableFields;
exports.createTokenInfo = createTokenInfo;
exports.getNestedValue = getNestedValue;
exports.isIndexConfig = isIndexConfig;
exports.isSearchOptions = isSearchOptions;
exports.isSearchResult = isSearchResult;
exports.normalizeFieldValue = normalizeFieldValue;
exports.optimizeIndex = optimizeIndex;
exports.validateDocument = validateDocument;
exports.validateIndexConfig = validateIndexConfig;
exports.validateSearchOptions = validateSearchOptions;
//# sourceMappingURL=index.cjs.js.map
