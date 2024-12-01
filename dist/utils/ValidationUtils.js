"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSearchOptions = validateSearchOptions;
exports.validateIndexConfig = validateIndexConfig;
exports.validateDocument = validateDocument;
const SearchUtils_1 = require("./SearchUtils");
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
        const value = (0, SearchUtils_1.getNestedValue)(document, field);
        return value !== undefined;
    });
}
