import { DocumentLink, IndexableDocument } from ".";

export interface SerializedTrieNode {
    weight: number;
    isEndOfWord: boolean;
    documentRefs: string[];
    children: { [key: string]: SerializedTrieNode };
}

export interface SerializedState {
    trie: SerializedTrieNode;
    documents: [string, IndexableDocument][];
    documentLinks: [string, DocumentLink[]][];
}