
// Importing necessary types

// Indexed Document Interface
export interface IndexedDocument {
    document(): import("../storage").IndexedDocument;
    [x: string]: any;
    id: string;
    fields: {
        title: string;
        content: string;
        author: string;
        tags: string[]; // Ensure this is a string array
    };
    metadata?: DocumentMetadata;
    toObject(): IndexedDocument;
}

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

export interface IndexableDocument {
    id: string;
    content: Record<string, DocumentValue>;
    metadata?: DocumentMetadata;

    [key: string]: DocumentValue | string | Record<string, any> | undefined;

    // Optional fields
    title?: string;
    author?: string;
    tags?: string[];
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
