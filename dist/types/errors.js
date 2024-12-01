"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageError = exports.ValidationError = exports.IndexError = exports.SearchError = void 0;
class SearchError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SearchError';
    }
}
exports.SearchError = SearchError;
class IndexError extends Error {
    constructor(message) {
        super(message);
        this.name = 'IndexError';
    }
}
exports.IndexError = IndexError;
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class StorageError extends Error {
    constructor(message) {
        super(message);
        this.name = 'StorageError';
    }
}
exports.StorageError = StorageError;
