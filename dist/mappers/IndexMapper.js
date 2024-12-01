"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexMapper = void 0;
const DataMapper_1 = require("./DataMapper");
const TrieSearch_1 = require("../algorithms/trie/TrieSearch");
class IndexMapper {
    constructor() {
        this.dataMapper = new DataMapper_1.DataMapper();
        this.trieSearch = new TrieSearch_1.TrieSearch();
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
exports.IndexMapper = IndexMapper;
