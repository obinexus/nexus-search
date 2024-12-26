
// Importing necessary types
export interface DocumentMetadata {
    [key: string]: any;
}

export type DocumentValue = any;

export interface DocumentLink {
    fromId(fromId: any): unknown;
    toId(toId: any): unknown;
    source: string;
    target: string;
}
export interface IndexableDocumentFields {
    title: string;
    content: string;
    author: string;
    tags: string[];
    version: string;
    modified?: string;
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
// Removed duplicate interface definition


export interface IndexedDocument {
    id: string;
    fields: IndexableDocumentFields;
    content: DocumentData;
    metadata?: DocumentMetadata;
    versions: any[];
    relations: any[];
    document: () => IndexedDocument;
    clone: () => IndexedDocument;
    update: (updates: Partial<IndexedDocument>) => IndexedDocument;
}
export interface SearchableDocument {
    id: string;
    content: Record<string, DocumentValue>;
    metadata?: DocumentMetadata;
}




export type DocumentContent = {
    [key: string]: DocumentValue | DocumentContent;
};

