import { DocumentVersion, DocumentRelation, NexusDocument, AdvancedSearchOptions, NexusDocumentPluginConfig, NexusDocumentFields, NexusDocumentMetadata } from "@/types/nexus-document";
import { IndexedDocument } from "@/storage";
import { DocumentData, IndexableDocumentFields, SearchResult } from "@/types";
/**
 * NexusDocumentAdapter provides document management functionality with search engine integration
 */
export declare class NexusDocumentAdapter implements NexusDocument {
    private static searchEngine;
    private static config;
    private _fields;
    private _metadata;
    private _content;
    private _versions;
    private _relations;
    private readonly _id;
    get id(): string;
    get fields(): NexusDocumentFields;
    get metadata(): NexusDocumentMetadata;
    get versions(): DocumentVersion[];
    get relations(): DocumentRelation[];
    get content(): DocumentData;
    constructor(doc: Partial<NexusDocument>);
    normalizeFields(fields?: Partial<NexusDocumentFields>): NexusDocumentFields;
    normalizeMetadata(metadata?: Partial<NexusDocumentMetadata>): NexusDocumentMetadata;
    private normalizeContent;
    getField<T extends keyof IndexableDocumentFields>(field: T): IndexableDocumentFields[T];
    setField<T extends keyof IndexableDocumentFields>(field: T, value: IndexableDocumentFields[T]): void;
    clone(): this;
    update(updates: Partial<IndexedDocument>): IndexedDocument;
    toObject(): this;
    document(): IndexedDocument;
    toJSON(): Record<string, any>;
    toIndexedDocument(): IndexedDocument;
    private addVersion;
    static initialize(config?: NexusDocumentPluginConfig): Promise<void>;
    private static getDefaultConfig;
    static search(query: string, options?: AdvancedSearchOptions): Promise<SearchResult<NexusDocumentAdapter>[]>;
    static get(id: string): Promise<IndexedDocument>;
    save(): Promise<void>;
    delete(): Promise<void>;
    private generateId;
    private static validateDocument;
}
