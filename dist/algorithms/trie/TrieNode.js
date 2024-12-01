"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrieNode = void 0;
class TrieNode {
    constructor() {
        this.children = new Map();
        this.isEndOfWord = false;
        this.data = new Set();
    }
}
exports.TrieNode = TrieNode;
