export declare class TrieSearch {
    private root;
    constructor();
    insert(word: string, documentId: string): void;
    search(prefix: string, maxResults?: number): Set<string>;
    private collectIds;
    fuzzySearch(word: string, maxDistance?: number): Set<string>;
    private fuzzySearchHelper;
    private levenshteinDistance;
}
