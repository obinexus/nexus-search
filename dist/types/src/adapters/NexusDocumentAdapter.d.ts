import { DocumentVersion, DocumentRelation, NexusDocument, AdvancedSearchOptions, CreateDocumentOptions, NexusDocumentMetadata, NexusFields, SearchResult, DocumentContent } from "@/types";
import { IndexedDocument } from "@/storage/IndexedDocument";
interface NexusDocumentInput extends Partial<NexusDocument> {
    id?: string;
    content?: DocumentContent;
}
interface NexusDocumentPluginConfig {
    name?: string;
    version?: number;
    fields?: string[];
    storage?: {
        type: 'memory' | 'indexeddb';
        options?: Record<string, any>;
    };
    versioning?: {
        enabled?: boolean;
        maxVersions?: number;
    };
    validation?: {
        required?: string[];
        customValidators?: Record<string, (value: any) => boolean>;
    };
}
/**
 * NexusDocumentAdapter provides document management functionality with search engine integration
 */
export declare class NexusDocumentAdapter implements NexusDocument {
    private static searchEngine;
    private static config;
    private readonly _id;
    private _fields;
    private _metadata;
    private _versions;
    private _relations;
    get id(): string;
    get fields(): NexusFields;
    get metadata(): NexusDocumentMetadata;
    get versions(): DocumentVersion[];
    get relations(): DocumentRelation[];
    constructor(doc: NexusDocumentInput);
    private normalizeFields;
    private normalizeMetadata;
    private normalizeContent;
    clone(): NexusDocument;
    update(updates: Partial<NexusDocument>): NexusDocument;
    document(): IndexedDocument;
    toObject(): NexusDocument;
    static initialize(config?: Partial<NexusDocumentPluginConfig>): Promise<void>;
    private static getDefaultConfig;
    static search(query: string, options?: AdvancedSearchOptions): Promise<SearchResult<NexusDocument>[]>;
    private static convertToNexusDocument;
    static create(options: CreateDocumentOptions): Promise<NexusDocument>;
    static get(id: string): Promise<NexusDocument>;
    save(): Promise<void>;
    delete(): Promise<void>;
    private generateId;
    private static validateDocument;
}
export {};
