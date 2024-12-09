import { TrieNode } from './TrieNode';
import { DocumentLink } from '../../types/document';
import { IndexableDocument } from '../../types/utils';
import { SerializedState, SerializedTrieNode } from '@/types';



export class TrieSearch {
    private root: TrieNode;
    private documents: Map<string, IndexableDocument>;
    private documentLinks: Map<string, DocumentLink[]>;

    constructor() {
        this.root = new TrieNode();
        this.documents = new Map();
        this.documentLinks = new Map();
    }

    // Main methods remain the same

    public exportState(): SerializedState {
        return {
            trie: this.serializeNode(this.root),
            documents: Array.from(this.documents.entries()),
            documentLinks: Array.from(this.documentLinks.entries())
        };
    }

    public importState(state: SerializedState): void {
        this.root = this.deserializeNode(state.trie);

        if (state.documents) {
            this.documents = new Map(state.documents);
        }

        if (state.documentLinks) {
            this.documentLinks = new Map(state.documentLinks);
        }
    }
    
    insert(word: string, documentId: string): void {
        let current = this.root;
        
        for (const char of word.toLowerCase()) {
            if (!current.children.has(char)) {
                current.children.set(char, new TrieNode());
            }
            current = current.children.get(char)!;
        }
        
        current.isEndOfWord = true;
        current.documentRefs.add(documentId);
    }

    search(prefix: string, maxResults: number = 10): Set<string> {
        const results = new Set<string>();
        let current = this.root;

        // Navigate to prefix endpoint
        for (const char of prefix.toLowerCase()) {
            if (!current.children.has(char)) {
                return results;
            }
            current = current.children.get(char)!;
        }

        // Collect all document references below this point
        this.collectDocumentRefs(current, results, maxResults);
        return results;
    }

    fuzzySearch(word: string, maxDistance: number = 2): Set<string> {
        const results = new Set<string>();
        this.fuzzySearchHelper(word.toLowerCase(), this.root, '', maxDistance, results);
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

        if (maxDistance > 0) {
            for (const [char, childNode] of node.children) {
                // Handle substitution
                const newDistance = word[currentWord.length] !== char ? maxDistance - 1 : maxDistance;
                this.fuzzySearchHelper(word, childNode, currentWord + char, newDistance, results);
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

     

    /**
     * Serializes a TrieNode for persistence
     */
    private serializeNode(node: TrieNode): SerializedTrieNode {
        const children: { [key: string]: SerializedTrieNode } = {};
        
        node.children.forEach((childNode, char) => {
            children[char] = this.serializeNode(childNode);
        });

        return {
            isEndOfWord: node.isEndOfWord,
            documentRefs: Array.from(node.documentRefs),
            children
        };
    }

    /**
     * Deserializes a node from its serialized form
     */
    private deserializeNode(serialized: SerializedTrieNode): TrieNode {
        const node = new TrieNode();
        node.isEndOfWord = serialized.isEndOfWord;
        node.documentRefs = new Set(serialized.documentRefs);

        Object.entries(serialized.children).forEach(([char, childData]) => {
            node.children.set(char, this.deserializeNode(childData));
        });

        return node;
    }

    /**
     * Clears all data from the trie
     */
    clear(): void {
        this.root = new TrieNode();
        this.documents.clear();
        this.documentLinks.clear();
    }

    /**
     * Gets the current size of the trie
     */
    getSize(): number {
        return this.documents.size;
    }
}