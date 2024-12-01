"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexManager = void 0;
const IndexMapper_1 = require("@/mappers/IndexMapper");
const SearchUtils_1 = require("@/utils/SearchUtils");
class IndexManager {
    constructor(config) {
        this.config = config;
        this.indexMapper = new IndexMapper_1.IndexMapper();
        this.documents = new Map();
    }
    async addDocuments(documents) {
        documents.forEach((doc, index) => {
            const id = this.generateDocumentId(index);
            this.documents.set(id, doc);
            const searchableFields = (0, SearchUtils_1.createSearchableFields)(doc, this.config.fields);
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
        this.indexMapper = new IndexMapper_1.IndexMapper();
    }
    generateDocumentId(index) {
        return `${this.config.name}-${index}-${Date.now()}`;
    }
}
exports.IndexManager = IndexManager;
