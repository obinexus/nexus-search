"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSearchOptions = isSearchOptions;
exports.isIndexConfig = isIndexConfig;
exports.isSearchResult = isSearchResult;
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
