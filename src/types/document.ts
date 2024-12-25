
// Importing necessary types
export interface IndexableDocumentFields {
    title: string;
    content: string;
    author: string;
    tags: string[];
    version: string;
    type?: string;
    category?: string;
    created?: string;
    modified?: string;
    status?: 'draft' | 'published' | 'archived';
    locale?: string;
    [key: string]: string | string[] | undefined;
    fields: IndexableDocumentFields & {
        type?: string;
        category?: string;
        created?: string;
        modified?: string;
        status?: 'draft' | 'published' | 'archived';
        locale?: string;
    };

}
// Indexed Document Interface
export interface IndexedDocument {
    id: string;
    document(): IndexedDocument;
    fields: IndexableDocumentFields;
    metadata?: DocumentMetadata;
    versions: any[];
    relations: any[];
    clone(): IndexedDocument;
    update(updates: Partial<IndexedDocument>): IndexedDocument;
}

// Types for primitive and complex values
export type PrimitiveValue = string | number | boolean | null;
export type ArrayValue = PrimitiveValue[];
export type ComplexValue = Record<string, PrimitiveValue | ArrayValue>;
export type DocumentValue = PrimitiveValue | ArrayValue | ComplexValue | undefined;

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
