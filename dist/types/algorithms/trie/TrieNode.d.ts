export declare class TrieNode {
    children: Map<string, TrieNode>;
    isEndOfWord: boolean;
    data: Set<string>;
    constructor();
}
