import { DocumentMetadata, IndexableDocumentFields, IndexedDocument } from "./document";
import { SearchOptions } from "./search";
/**
 * Version information for document versioning system
 */
export interface DocumentVersion {
    /** Document version number */
    version: number;
    /** Content at this version */
    content: string;
    /** Modification timestamp */
    modified: Date;
    /** Author who made the changes */
    author: string;
    /** Optional changelog message */
    changelog?: string;
}
/**
 * Relationship definition between documents
 */
export interface DocumentRelation {
    /** Source document ID */
    sourceId: string;
    /** Target document ID */
    targetId: string;
    /** Type of relationship */
    type: 'reference' | 'parent' | 'child' | 'related';
    /** Optional metadata for the relationship */
    metadata?: Record<string, any>;
}
/**
 * Workflow status information
 */
export interface DocumentWorkflow {
    /** Current workflow status */
    status: string;
    /** Optional assignee for the document */
    assignee?: string;
    /** Optional due date */
    dueDate?: string;
}
/**
 * Extended metadata for Nexus documents
 */
export interface NexusDocumentMetadata extends DocumentMetadata {
    /** Timestamp when document was indexed */
    indexed: number;
    /** Last modification timestamp */
    lastModified: number;
    /** Optional document checksum */
    checksum?: string;
    /** Optional access permissions */
    permissions?: string[];
    /** Optional workflow information */
    workflow?: DocumentWorkflow;
}
/**
 * Fields specific to Nexus documents
 */
export interface NexusDocumentFields extends IndexableDocumentFields {
    /** Document title */
    title: string;
    /** Document content */
    content: string;
    /** Document type */
    type: string;
    /** Associated tags */
    tags: string[];
    /** Optional category */
    category?: string | string[];
    /** Document author */
    author: string;
    /** Creation timestamp (ISO string) */
    created: string;
    /** Modification timestamp (ISO string) */
    modified: string;
    /** Document status */
    status: 'draft' | 'published' | 'archived';
    /** Version identifier */
    version: string;
    /** Optional locale */
    locale?: string;
    /** Allow additional string fields */
    [key: string]: string | string[] | undefined;
}
/**
 * Nexus document interface extending base indexed document
 */
export interface NexusDocument extends IndexedDocument {
    /** Document fields */
    fields: NexusDocumentFields;
    /** Document versions */
    versions: DocumentVersion[];
    /** Document relationships */
    relations: DocumentRelation[];
    /** Extended metadata */
    metadata: NexusDocumentMetadata;
    /** Clone the document */
    clone(): this;
    /** Update document fields */
    update(updates: Partial<IndexedDocument>): IndexedDocument;
    /** Convert to plain object */
    toObject(): this;
}
/**
 * Configuration options for Nexus document plugin
 */
export interface NexusDocumentPluginConfig {
    /** Plugin instance name */
    name?: string;
    /** Plugin version */
    version?: number;
    /** Searchable document fields */
    fields?: string[];
    /** Storage configuration */
    storage?: {
        /** Storage type */
        type: 'memory' | 'indexeddb';
        /** Optional storage options */
        options?: Record<string, any>;
    };
    /** Version control settings */
    versioning?: {
        /** Whether versioning is enabled */
        enabled: boolean;
        /** Maximum number of versions to keep */
        maxVersions?: number;
    };
    /** Document validation rules */
    validation?: {
        /** Required field names */
        required?: string[];
        /** Custom validation functions */
        customValidators?: Record<string, (value: any) => boolean>;
    };
}
/**
 * Parameters for creating new documents
 */
export interface CreateDocumentOptions {
    /** Document title */
    title: string;
    /** Document content */
    content: string;
    /** Document type */
    type: string;
    /** Optional tags */
    tags?: string[];
    /** Optional category */
    category?: string;
    /** Document author */
    author: string;
    /** Optional status */
    status?: 'draft' | 'published' | 'archived';
    /** Optional locale */
    locale?: string;
    /** Optional metadata */
    metadata?: Partial<NexusDocumentMetadata>;
}
/**
 * Enhanced search options for documents
 */
export interface AdvancedSearchOptions extends SearchOptions {
    /** Filter criteria */
    filters?: {
        /** Filter by status */
        status?: ('draft' | 'published' | 'archived')[];
        /** Filter by date range */
        dateRange?: {
            /** Start date */
            start: Date;
            /** End date */
            end: Date;
        };
        /** Filter by categories */
        categories?: string[];
        /** Filter by types */
        types?: string[];
        /** Filter by authors */
        authors?: string[];
    };
    /** Sort configuration */
    sort?: {
        /** Field to sort by */
        field: keyof NexusDocumentFields;
        /** Sort order */
        order: 'asc' | 'desc';
    };
}
