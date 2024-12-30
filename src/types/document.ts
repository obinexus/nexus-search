import { SearchOptions } from "./search";

// ----------------
// Base Types
// ----------------

export type PrimitiveValue = string | number | boolean | null;
export type ArrayValue = PrimitiveValue[];
export type DocumentValue = PrimitiveValue | ArrayValue | Record<string, any>;

export type DocumentContent = {
    [key: string]: DocumentValue | DocumentContent;
};

// ----------------
// Metadata Types
// ----------------
export interface DocumentMetadata {
    indexed?: number;
    lastModified?: number;
    [key: string]: any;
}

export interface NexusDocumentMetadata extends DocumentMetadata {
    indexed: number;
    lastModified: number;
    checksum?: string;
    permissions?: string[];
    workflow?: DocumentWorkflow;
}

// ----------------
// Field Types
// ----------------

export interface BaseFields {
    title: string;
    content: DocumentContent;
    author: string;
    tags: string[];
    version: string;
    modified?: string;
    [key: string]: DocumentValue | undefined;
}

export interface IndexableFields extends BaseFields {
    content: DocumentContent;
}

export interface NexusFields extends IndexableFields {
    type: string;
    category?: string;
    created: string;
    status: DocumentStatus;
    locale?: string;
}

// ----------------
// Document Types
// ----------------

export interface DocumentBase {
    id: string;
    metadata?: DocumentMetadata;
    versions: DocumentVersion[];
    relations: DocumentRelation[];
}

export interface IndexedDocument extends DocumentBase {
    fields: IndexableFields;
    metadata?: DocumentMetadata;
    links?: string[];
    ranks?: number[];
    document(): IndexedDocument;
}

export interface NexusDocument extends Omit<IndexedDocument, 'fields' | 'metadata'> {
    fields: NexusFields;
    metadata: NexusDocumentMetadata;
    clone(): NexusDocument;
    update(updates: Partial<NexusDocument>): NexusDocument;
    toObject(): NexusDocument;
}

export interface SearchableDocument extends DocumentBase {
    content: Record<string, DocumentValue>;
}
export interface IndexedDocumentData extends DocumentBase {
    fields: BaseFields;
    metadata?: DocumentMetadata;
    versions: Array<DocumentVersion>;
    relations: Array<DocumentRelation>;
}

// ----------------
// Relationship Types
// ----------------

export interface DocumentLink {
    source: string;
    target: string;
    fromId(fromId: string): string;
    toId(toId: string): string;
}

export interface DocumentRelation {
    sourceId: string;
    targetId: string;
    type: RelationType;
    metadata?: Record<string, any>;
}

export interface DocumentVersion {
    version: number;
    content: DocumentContent;
    modified: Date;
    author: string;
    changelog?: string;
}

// ----------------
// Supporting Types
// ----------------

export interface DocumentRank {
    id: string;
    rank: number;
    incomingLinks: number;
    outgoingLinks: number;
    content: Record<string, any>;
    metadata?: DocumentMetadata;
}

export interface DocumentWorkflow {
    status: string;
    assignee?: string;
    dueDate?: string;
}

// ----------------
// Configuration Types
// ----------------

export interface DocumentConfig {
    fields?: string[];
    storage?: StorageConfig;
    versioning?: VersioningConfig;
    validation?: ValidationConfig;
}

export interface StorageConfig {
    type: 'memory' | 'indexeddb';
    options?: Record<string, any>;
}

export interface VersioningConfig {
    enabled: boolean;
    maxVersions?: number;
}

export interface ValidationConfig {
    required?: string[];
    customValidators?: Record<string, (value: any) => boolean>;
}

// ----------------
// Operation Types
// ----------------

export interface CreateDocumentOptions {
    title: string;
    content: DocumentContent;
    type: string;
    tags?: string[];
    category?: string;
    author: string;
    status?: DocumentStatus;
    locale?: string;
    metadata?: Partial<NexusDocumentMetadata>;
}

export interface AdvancedSearchOptions extends SearchOptions {
    filters?: SearchFilters;
    sort?: SortConfig;
}

// ----------------
// Enums and Constants
// ----------------

export type DocumentStatus = 'draft' | 'published' | 'archived';
export type RelationType = 'reference' | 'parent' | 'child' | 'related';

// ----------------
// Helper Types
// ----------------

interface SearchFilters {
    status?: DocumentStatus[];
    dateRange?: {
        start: Date;
        end: Date;
    };
    categories?: string[];
    types?: string[];
    authors?: string[];
}

interface SortConfig {
    field: keyof NexusFields;
    order: 'asc' | 'desc';
}

