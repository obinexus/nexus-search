"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSearchStats = createSearchStats;
exports.createSearchContext = createSearchContext;
exports.createTokenInfo = createTokenInfo;
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
