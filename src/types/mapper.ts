export interface MapperState {
    trie: unknown;
    dataMap: Record<string, string[]>;
}

export interface MapperOptions {
    caseSensitive?: boolean;
    normalization?: boolean;
}
