export interface IndexedDocument {
    id: string;
    fields: {
        title: string;
        content: string;
        author: string;
        tags: string[];
    };
    metadata?: DocumentMetadata;
    toObject(): IndexedDocument;
}
export type PrimitiveValue = string | number | boolean | null;
export type ArrayValue = PrimitiveValue[];
export type ComplexValue = Record<string, PrimitiveValue | ArrayValue>;
export type DocumentValue = PrimitiveValue | ArrayValue | ComplexValue;
export type DocumentMetadata = Record<string, DocumentValue>;
export interface DocumentLink {
    fromId: string;
    toId: string;
    weight: number;
}
export interface DocumentRank {
    id: string;
    rank: number;
    incomingLinks: number;
    outgoingLinks: number;
}
export interface DocumentData {
    content: string;
    metadata?: DocumentMetadata;
    [key: string]: unknown;
}
export interface IndexableDocument {
    id: string;
    content: Record<string, DocumentValue>;
    metadata?: DocumentMetadata;
    [key: string]: DocumentValue | string | Record<string, any> | undefined;
    title?: string;
    author?: string;
    tags?: string[];
}
export interface SerializedTrieNode {
    isEndOfWord: boolean;
    documentRefs: string[];
    weight: number;
    children: {
        [key: string]: SerializedTrieNode;
    };
}
export interface SerializedState {
    trie: SerializedTrieNode;
    documents: [string, IndexableDocument][];
    documentLinks: [string, DocumentLink[]][];
}
