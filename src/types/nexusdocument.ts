import { DocumentMetadata, IndexableDocumentFields, IndexedDocument } from "./document";
import { SearchOptions } from "./search";

/** Document version information */
export interface DocumentVersion {
    version: number;
    content: string;
    modified: Date;
    author: string;
    changelog?: string;
}

/** Document relationship definition */
export interface DocumentRelation {
    sourceId: string;
    targetId: string;
    type: 'reference' | 'parent' | 'child' | 'related';
    metadata?: Record<string, any>;
}

/** Plugin configuration options */
export interface NexusDocumentPluginConfig {
    /** Plugin instance name */
    name?: string;
    /** Plugin version */
    version?: number;
    /** Searchable document fields */
    fields?: string[];
    /** Storage configuration */
    storage?: {
        type: 'memory' | 'indexeddb';
        options?: Record<string, any>;
    };
    /** Version control settings */
    versioning?: {
        enabled: boolean;
        maxVersions?: number;
    };
    /** Document validation rules */
    validation?: {
        required?: string[];
        customValidators?: Record<string, (value: any) => boolean>;
    };
}

/** Extended document interface */
export interface NexusDocument extends IndexedDocument {
    fields: { [key: string]: string | string[] } & IndexableDocumentFields & {
        title: string;
        content: string;
        type: string;
        tags: string[];
        category?: string;
        author: string;
        created: string;  // ISO date string
        modified: string; // ISO date string
        status: 'draft' | 'published' | 'archived';
        version: string;
        locale?: string;
    };
    versions: DocumentVersion[];
    relations: DocumentRelation[];
    metadata: DocumentMetadata & {
        indexed: number;
        lastModified: number;
        checksum?: string;
        permissions?: string[];
        workflow?: {
            status: string;
            assignee?: string;
            dueDate?: string;
        };
    };
    clone(): this;
    update(updates: Partial<IndexedDocument>): IndexedDocument;
    toObject(): this;
}

/** Document creation parameters */
export interface CreateDocumentOptions {
    title: string;
    content: string;
    type: string;
    tags?: string[];
    category?: string;
    author: string;
    status?: 'draft' | 'published' | 'archived';
    locale?: string;
    metadata?: Partial<NexusDocument['metadata']>;
}

/** Enhanced search options */
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
        field: keyof NexusDocument['fields'];
        order: 'asc' | 'desc';
    };
}