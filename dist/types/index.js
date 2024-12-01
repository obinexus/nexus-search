"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SEARCH_OPTIONS = exports.DEFAULT_INDEX_OPTIONS = void 0;
exports.isSearchOptions = isSearchOptions;
exports.isIndexConfig = isIndexConfig;
exports.isSearchResult = isSearchResult;
exports.createSearchStats = createSearchStats;
exports.createSearchContext = createSearchContext;
exports.createTokenInfo = createTokenInfo;
__exportStar(require("./types"), exports);
__exportStar(require("./errors"), exports);
__exportStar(require("./events"), exports);
__exportStar(require("./internal"), exports);
__exportStar(require("./guards"), exports);
__exportStar(require("./utils"), exports);
__exportStar(require("./defaults"), exports);
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
exports.DEFAULT_INDEX_OPTIONS = {
    caseSensitive: false,
    stemming: true,
    stopWords: ['the', 'a', 'an', 'and', 'or', 'but'],
    minWordLength: 2,
    maxWordLength: 50,
    fuzzyThreshold: 0.8
};
exports.DEFAULT_SEARCH_OPTIONS = {
    fuzzy: false,
    maxResults: 10,
    threshold: 0.5,
    fields: [],
    sortBy: 'score',
    sortOrder: 'desc',
    page: 1,
    pageSize: 10
};
