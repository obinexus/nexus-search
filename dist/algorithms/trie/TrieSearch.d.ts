import { DocumentLink } from '../../types/document';
interface SerializedTrieNode {
    isEndOfWord: boolean;
    documentRefs: string[];
    children: {
        [key: string]: SerializedTrieNode;
    };
}
export declare class TrieSearch {
    private root;
    private documents;
    private documentLinks;
    constructor();
    insert(word: string, documentId: string): void;
    search(prefix: string, maxResults?: number): Set<string>;
    fuzzySearch(word: string, maxDistance?: number): Set<string>;
    private collectDocumentRefs;
    private fuzzySearchHelper;
    private calculateLevenshteinDistance;
    /**
   * Exports the trie state for persistence
   * @returns Serialized trie state
   */
    exportState(): {
        trie: SerializedTrieNode;
        documents: [string, any][];
        documentLinks: [string, DocumentLink[]][];
    };
    /**
     * Imports a previously exported trie state
     * @param state The state to import
     */
    importState(state: {
        trie: SerializedTrieNode;
        documents?: [string, any][];
        documentLinks?: [string, DocumentLink[]][];
    }): void;
    /**
     * Serializes a TrieNode for persistence
     */
    private serializeNode;
    /**
     * Deserializes a node from its serialized form
     */
    private deserializeNode;
    /**
     * Clears all data from the trie
     */
    clear(): void;
    /**
     * Gets the current size of the trie
     */
    getSize(): number;
}
export {};
