"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSearchableFields = createSearchableFields;
exports.normalizeFieldValue = normalizeFieldValue;
exports.getNestedValue = getNestedValue;
exports.optimizeIndex = optimizeIndex;
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
