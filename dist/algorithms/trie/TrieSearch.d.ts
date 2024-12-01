interface SerializedTrieNode {
    isEndOfWord: boolean;
    data: string[];
    children: {
        [key: string]: SerializedTrieNode;
    };
}
export declare class TrieSearch {
    private root;
    constructor();
    insert(word: string, documentId: string): void;
    search(prefix: string, maxResults?: number): Set<string>;
    exportState(): SerializedTrieNode;
    importState(state: SerializedTrieNode): void;
    private collectIds;
    fuzzySearch(word: string, maxDistance?: number): Set<string>;
    private fuzzySearchHelper;
    private levenshteinDistance;
    private serializeNode;
    private deserializeNode;
}
export {};
