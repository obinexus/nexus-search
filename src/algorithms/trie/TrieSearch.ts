import {  IndexableDocument, DocumentLink, SerializedState, SerializedTrieNode } from "@/types";
import { TrieNode } from "./TrieNode";

export class TrieSearch {
    private root: TrieNode;
    private documents: Map<string, IndexableDocument>;
    private documentLinks: Map<string, DocumentLink[]>;

    constructor() {
        this.root = new TrieNode();
        this.documents = new Map();
        this.documentLinks = new Map();
    }

    public insert(text: string, documentId: string): void {
        if (!text || !documentId) return;

        const words = text.toLowerCase().split(/\s+/).filter(Boolean);

        for (const word of words) {
            let current = this.root;

            for (const char of word) {
                if (!current.children.has(char)) {
                    current.children.set(char, new TrieNode());
                }
                current = current.children.get(char)!;
            }

            current.isEndOfWord = true;
            current.documentRefs.add(documentId);
            current.weight += 1.0;
        }
    }

    public search(query: string, maxResults: number = 10): Set<string> {
        if (!query) return new Set();

        const results = new Set<string>();
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);

        for (const word of words) {
            let current = this.root;
            let found = true;

            for (const char of word) {
                if (!current.children.has(char)) {
                    found = false;
                    break;
                }
                current = current.children.get(char)!;
            }

            if (found && current.isEndOfWord) {
                this.collectDocumentRefs(current, results, maxResults);
            }
        }

        return results;
    }

    public fuzzySearch(query: string, maxDistance: number = 2): Set<string> {
        if (!query) return new Set();

        const results = new Set<string>();
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);

        for (const word of words) {
            this.fuzzySearchHelper(word, this.root, '', maxDistance, results);
        }

        return results;
    }

    private collectDocumentRefs(node: TrieNode, results: Set<string>, maxResults: number): void {
        if (node.isEndOfWord) {
            for (const docId of node.documentRefs) {
                if (results.size >= maxResults) return;
                results.add(docId);
            }
        }

        for (const child of node.children.values()) {
            if (results.size >= maxResults) return;
            this.collectDocumentRefs(child, results, maxResults);
        }
    }

    private fuzzySearchHelper(
        word: string,
        node: TrieNode,
        currentWord: string,
        maxDistance: number,
        results: Set<string>
    ): void {
        if (maxDistance < 0) return;

        if (node.isEndOfWord) {
            const distance = this.calculateLevenshteinDistance(word, currentWord);
            if (distance <= maxDistance) {
                node.documentRefs.forEach(id => results.add(id));
            }
        }

        for (const [char, childNode] of node.children) {
            const newDistance = word[currentWord.length] !== char ? maxDistance - 1 : maxDistance;
            this.fuzzySearchHelper(word, childNode, currentWord + char, newDistance, results);

            if (maxDistance > 0) {
                this.fuzzySearchHelper(word, childNode, currentWord, maxDistance - 1, results);
            }
        }
    }

    private calculateLevenshteinDistance(s1: string, s2: string): number {
        const dp: number[][] = Array(s1.length + 1).fill(0)
            .map(() => Array(s2.length + 1).fill(0));

        for (let i = 0; i <= s1.length; i++) dp[i][0] = i;
        for (let j = 0; j <= s2.length; j++) dp[0][j] = j;

        for (let i = 1; i <= s1.length; i++) {
            for (let j = 1; j <= s2.length; j++) {
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1,
                    dp[i - 1][j - 1] + (s1[i - 1] !== s2[j - 1] ? 1 : 0)
                );
            }
        }

        return dp[s1.length][s2.length];
    }

    public exportState(): SerializedState {
        return {
            trie: this.serializeNode(this.root),
            documents: Array.from(this.documents.entries()),
            documentLinks: Array.from(this.documentLinks.entries())
        };
    }

    public importState(state: SerializedState): void {
        this.root = this.deserializeNode(state.trie);
        this.documents = new Map(state.documents);
        this.documentLinks = new Map(state.documentLinks);
    }

    private serializeNode(node: TrieNode): SerializedTrieNode {
        const children: { [key: string]: SerializedTrieNode } = {};

        node.children.forEach((childNode, char) => {
            children[char] = this.serializeNode(childNode);
        });

        return {
            isEndOfWord: node.isEndOfWord,
            documentRefs: Array.from(node.documentRefs),
            weight: node.weight,
            children
        };
    }

    private deserializeNode(serialized: SerializedTrieNode): TrieNode {
        const node = new TrieNode();
        node.isEndOfWord = serialized.isEndOfWord;
        node.documentRefs = new Set(serialized.documentRefs);
        node.weight = serialized.weight ?? 0;

        Object.entries(serialized.children).forEach(([char, childData]) => {
            node.children.set(char, this.deserializeNode(childData));
        });

        return node;
    }

    public clear(): void {
        this.root = new TrieNode();
        this.documents.clear();
        this.documentLinks.clear();
    }

    public getSize(): number {
        return this.documents.size;
    }
}