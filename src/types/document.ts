
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
    [key: string]: any;
    title: string;
    content: string;
    author: string;
    tags: string[];
}
export interface IndexedDocument {
    id: string;
    fields: {
        title: string;
        content: string;
        author: string;
        tags: string[];
        [key: string]: any;
    };
    metadata?: DocumentMetadata;
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
