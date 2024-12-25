
// Importing necessary types
export interface DocumentMetadata {
    [key: string]: any;
}

export type DocumentValue = any;

export interface DocumentLink {
    source: string;
    target: string;
}
export interface IndexableDocumentFields {
    title: string;
    content: string;
    author: string;
    tags: string[];
}

// Types for primitive and complex values
export type PrimitiveValue = string | number | boolean | null;
export type ArrayValue = PrimitiveValue[];
export type ComplexValue = Record<string, PrimitiveValue | ArrayValue>;
export interface IndexedDocument {
    id: string;
    fields: IndexableDocumentFields;
    metadata?: DocumentMetadata;
}

export interface DocumentRank {
    id: string;
    rank: number;
    incomingLinks: number;
    outgoingLinks: number;
    content: Record<string, any>;
    metadata?: DocumentMetadata;
}
// Core document interfaces
export interface DocumentData {
    [key: string]: any;
    metadata?: DocumentMetadata;
}

export interface IndexedDocument {
    id: string;
    fields: {
        title: string;
        content: string;
        author: string;
        tags: string[];
    };
    metadata?: DocumentMetadata;
}

export interface SearchableDocument {
    id: string;
    content: Record<string, DocumentValue>;
    metadata?: DocumentMetadata;
}
