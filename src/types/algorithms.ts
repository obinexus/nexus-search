export interface TrieNode<T = unknown> {
    value: T;
    isEnd: boolean;
    children: Map<string, TrieNode<T>>;
}

export interface TrieSearchOptions {
    caseSensitive?: boolean;
    fuzzy?: boolean;
    maxDistance?: number;
}