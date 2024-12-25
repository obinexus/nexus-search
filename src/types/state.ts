import { DocumentLink, IndexableDocument } from "./document";

export interface SerializedTrieNode {
    isEndOfWord: boolean;
    documentRefs: string[];
    weight: number;
    children: { [key: string]: SerializedTrieNode };
}

export interface SerializedState {
    trie: SerializedTrieNode;
    documents: [string, IndexableDocument][];
    documentLinks: [string, DocumentLink[]][];
}