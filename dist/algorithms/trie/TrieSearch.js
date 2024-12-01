"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrieSearch = void 0;
const TrieNode_1 = require("./TrieNode");
class TrieSearch {
    constructor() {
        this.root = new TrieNode_1.TrieNode();
    }
    insert(word, documentId) {
        let current = this.root;
        for (const char of word.toLowerCase()) {
            if (!current.children.has(char)) {
                current.children.set(char, new TrieNode_1.TrieNode());
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
}
exports.TrieSearch = TrieSearch;
