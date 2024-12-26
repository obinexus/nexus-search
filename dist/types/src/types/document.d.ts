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
    [key: string]: string | string[] | number | boolean | null | undefined;
}
export type PrimitiveValue = string | number | boolean | null;
export type ArrayValue = PrimitiveValue[];
export type ComplexValue = Record<string, PrimitiveValue | ArrayValue>;
export interface DocumentRank {
    id: string;
    rank: number;
    incomingLinks: number;
    outgoingLinks: number;
    content: Record<string, any>;
    metadata?: DocumentMetadata;
}
export interface DocumentData {
    [key: string]: any;
    metadata?: DocumentMetadata;
}
export type DocumentContent = {
    [key: string]: DocumentValue | DocumentContent;
};
export interface IndexedDocument {
    id: string;
    fields: IndexableDocumentFields;
    metadata?: DocumentMetadata;
    versions: Array<{
        version: number;
        content: string;
        modified: Date;
        author: string;
    }>;
    relations: Array<{
        type: string;
        targetId: string;
    }>;
    content: DocumentData;
    toObject(): IndexedDocument;
    document(): IndexedDocument;
    clone(): IndexedDocument;
    update(updates: Partial<IndexedDocument>): IndexedDocument;
}
export interface SearchableDocument {
    id: string;
    content: Record<string, DocumentValue>;
    metadata?: DocumentMetadata;
}
/**
 * Configuration for document operations
 */
export interface DocumentConfig {
    fields?: string[];
    storage?: {
        type: 'memory' | 'indexeddb';
        options?: Record<string, any>;
    };
    versioning?: {
        enabled: boolean;
        maxVersions?: number;
    };
    validation?: {
        required?: string[];
        customValidators?: Record<string, (value: any) => boolean>;
    };
}
