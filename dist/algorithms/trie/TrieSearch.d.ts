import { SerializedState } from '@/types';
export declare class TrieSearch {
    private root;
    private documents;
    private documentLinks;
    constructor();
    exportState(): SerializedState;
    importState(state: SerializedState): void;
    insert(word: string, documentId: string): void;
    search(prefix: string, maxResults?: number): Set<string>;
    fuzzySearch(word: string, maxDistance?: number): Set<string>;
    private collectDocumentRefs;
    private fuzzySearchHelper;
    private calculateLevenshteinDistance;
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
