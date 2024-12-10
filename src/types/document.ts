// Types for primitive and complex values
export type PrimitiveValue = string | number | boolean | null;
export type ArrayValue = PrimitiveValue[];
export type ComplexValue = Record<string, PrimitiveValue | ArrayValue>;
export type DocumentValue = PrimitiveValue | ArrayValue | ComplexValue;

// Metadata types
export type DocumentMetadata = Record<string, DocumentValue>;

// Document relationship types
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

// Core document interfaces
export interface DocumentData {
    content: string;
    metadata?: DocumentMetadata;
    [key: string]: unknown;
}

// Fixed IndexedDocument interface to resolve the conflict
export interface IndexedDocument {
    id: string;
    fields: Record<string, string>;
    metadata?: DocumentMetadata;
    [key: string]: DocumentValue | DocumentMetadata | undefined | string | Record<string, string>;
}

export interface IndexableDocument {
    id: string;
    content: Record<string, DocumentValue>;
    metadata?: DocumentMetadata;
}

// Serialization interfaces
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