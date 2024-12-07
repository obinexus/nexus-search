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
}
