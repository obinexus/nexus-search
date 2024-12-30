import { SearchOptions } from "./search";

// Base metadata and value types
export interface DocumentMetadata {
    indexed?: number;
    lastModified?: number;
    [key: string]: any;
}

export type DocumentValue = any;

// Document content type definitions
export type DocumentContent = {
    [key: string]: DocumentValue | DocumentContent;
};

// Link interface for document relationships
export interface DocumentLink {
    fromId(fromId: any): unknown;
    toId(toId: any): unknown;
    source: string;
    target: string;
}

// Core document field structure
export interface BaseDocumentFields {
    title: string;
    author: string;
    tags: string[];
    version: string;
    modified?: string;
    [key: string]: DocumentValue | DocumentContent | string | string[] | number | boolean | null | undefined;
}

// Value type definitions
export type PrimitiveValue = string | number | boolean | null;
export type ArrayValue = PrimitiveValue[];
export type ComplexValue = Record<string, PrimitiveValue | ArrayValue>;

// Document ranking interface
export interface DocumentRank {
    id: string;
    rank: number;
    incomingLinks: number;
    outgoingLinks: number;
    content: Record<string, any>;
    metadata?: DocumentMetadata;
}

// Core document data interface
export interface DocumentData {
    metadata?: DocumentMetadata;
    content: DocumentContent;
    links: DocumentLink[];
    ranks: DocumentRank[];
    [key: string]: any;
}

// Base indexable document fields
export interface IndexableDocumentFields extends BaseDocumentFields {
    content: DocumentContent;
}

// Base indexed document interface
export interface IndexedDocument {
    id: string;
    fields: IndexableDocumentFields;
    metadata?: DocumentMetadata;
    versions: Array<{
        version: number;
        content: DocumentContent;
        modified: Date;
        author: string;
    }>;
    relations: Array<{
        type: string;
        targetId: string;
    }>;
    content: DocumentData;
    document(): IndexedDocument;
    links?: string[];
    ranks?: number[];
}

// Searchable document interface
export interface SearchableDocument {
    id: string;
    content: Record<string, DocumentValue>;
    metadata?: DocumentMetadata;
}

// Document configuration
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

// Version information
export interface DocumentVersion {
    version: number;
    content: DocumentContent;
    modified: Date;
    author: string;
    changelog?: string;
}

// Document relationship
export interface DocumentRelation {
    sourceId: string;
    targetId: string;
    type: 'reference' | 'parent' | 'child' | 'related';
    metadata?: Record<string, any>;
}

// Workflow status
export interface DocumentWorkflow {
    status: string;
    assignee?: string;
    dueDate?: string;
}

// Extended metadata for Nexus documents
export interface NexusDocumentMetadata extends DocumentMetadata {
    indexed: number;
    lastModified: number;
    checksum?: string;
    permissions?: string[];
    workflow?: DocumentWorkflow;
}

// Nexus document fields
export interface NexusDocumentFields extends IndexableDocumentFields {
    type: string;
    category?: string;
    created: string;
    status: 'draft' | 'published' | 'archived';
    locale?: string;
}

// Complete Nexus document interface
export interface NexusDocument extends Omit<IndexedDocument, 'fields'> {
    fields: NexusDocumentFields;
    metadata: NexusDocumentMetadata;
    versions: DocumentVersion[];
    relations: DocumentRelation[];
    clone(): NexusDocument;
    update(updates: Partial<NexusDocument>): NexusDocument;
    toObject(): NexusDocument;
}


// Document creation options
export interface CreateDocumentOptions {
    title: string;
    content: DocumentContent;
    type: string;
    tags?: string[];
    category?: string;
    author: string;
    status?: 'draft' | 'published' | 'archived';
    locale?: string;
    metadata?: Partial<NexusDocumentMetadata>;
}

// Advanced search options
export interface AdvancedSearchOptions extends SearchOptions {
    filters?: {
        status?: ('draft' | 'published' | 'archived')[];
        dateRange?: {
            start: Date;
            end: Date;
        };
        categories?: string[];
        types?: string[];
        authors?: string[];
    };
    sort?: {
        field: keyof NexusDocumentFields;
        order: 'asc' | 'desc';
    };
}