import { SearchEngine } from "@/core";
import { 
    DocumentVersion, 
    DocumentRelation, 
    NexusDocument, 
    AdvancedSearchOptions, 
    CreateDocumentOptions, 
    NexusDocumentPluginConfig, 
    NexusDocumentFields, 
    NexusDocumentMetadata 
} from "@/types/nexus-document";
import { IndexedDocument } from "@/storage";
import { DocumentData, IndexableDocumentFields, SearchResult } from "@/types";

/**
 * NexusDocumentAdapter provides document management functionality with search engine integration
 */
export class NexusDocumentAdapter implements NexusDocument {
    private static searchEngine: SearchEngine;
    private static config: Required<NexusDocumentPluginConfig>;
    
    private _fields: NexusDocumentFields;
    private _metadata: NexusDocumentMetadata;
    private _content: DocumentData;
    private _versions: DocumentVersion[];
    private _relations: DocumentRelation[];
    private readonly _id: string;

    // Property getters
    get id(): string { return this._id; }
    get fields(): NexusDocumentFields { return { ...this._fields }; }
    get metadata(): NexusDocumentMetadata { return { ...this._metadata }; }
    get versions(): DocumentVersion[] { return [...this._versions]; }
    get relations(): DocumentRelation[] { return [...this._relations]; }
    get content(): DocumentData { return { ...this._content }; }

    constructor(doc: Partial<NexusDocument>) {
        this._id = doc.id || this.generateId();
        this._fields = this.normalizeFields(doc.fields);
        this._metadata = this.normalizeMetadata(doc.metadata);
        this._versions = doc.versions || [];
        this._relations = doc.relations || [];
        this._content = this.normalizeContent();
    }

    normalizeFields(fields?: Partial<NexusDocumentFields>): NexusDocumentFields {
        const now = new Date().toISOString();
        const normalized: NexusDocumentFields = {
            title: fields?.title ?? '',
            content: fields?.content ?? '',
            type: fields?.type ?? '',
            tags: fields?.tags ?? [],
            category: fields?.category ?? '',
            author: fields?.author ?? '',
            created: fields?.created ?? now,
            modified: fields?.modified ?? now,
            status: fields?.status ?? 'draft',
            version: fields?.version ?? '1',
            locale: fields?.locale ?? ''
        };

        // Ensure all string values are not undefined
        Object.keys(fields || {}).forEach(key => {
            const value = (fields as any)?.[key];
            if (value !== undefined) {
                (normalized as any)[key] = value;
            }
        });

        return normalized;
    }

    normalizeMetadata(metadata?: Partial<NexusDocumentMetadata>): NexusDocumentMetadata {
        const now = Date.now();
        return {
            indexed: metadata?.indexed ?? now,
            lastModified: metadata?.lastModified ?? now,
            checksum: metadata?.checksum,
            permissions: metadata?.permissions ?? [],
            workflow: metadata?.workflow
        };
    }

    private normalizeContent(): DocumentData {
        return {
            ...this._fields,
            metadata: this._metadata
        };
    }

    getField<T extends keyof IndexableDocumentFields>(field: T): IndexableDocumentFields[T] {
        return this._fields[field];
    }

    setField<T extends keyof IndexableDocumentFields>(field: T, value: IndexableDocumentFields[T]): void {
   
        this._fields = this.normalizeFields({

            ...this._fields,

            [field]: value as string | string[] | undefined

        });

        this._content = this.normalizeContent();
    }

    clone(): this {
        return new NexusDocumentAdapter(this) as this;
    }

    update(updates: Partial<IndexedDocument>): IndexedDocument {
        const normalized = new NexusDocumentAdapter({
            ...this,
            fields: this.normalizeFields({
                ...this._fields,
                ...(updates.fields || {}),
                modified: new Date().toISOString()
            }),
            metadata: this.normalizeMetadata({
                ...this._metadata,
                ...(updates.metadata || {}),
                lastModified: Date.now()
            })
        });

        if (updates.fields?.content && updates.fields.content !== this._fields.content) {
            normalized.addVersion({
                version: Number(this._fields.version),
                content: this._fields.content,
                modified: new Date(),
                author: this._fields.author
            });
        }

        return normalized.toIndexedDocument();
    }

    toObject(): this {
        return this;
    }

    document(): IndexedDocument {
        return this.toIndexedDocument();
    }

    toJSON(): Record<string, any> {
        return {
            id: this._id,
            fields: this._fields,
            metadata: this._metadata,
            versions: this._versions,
            relations: this._relations,
            content: this._content
        };
    }

    toIndexedDocument(): IndexedDocument {
        // Create base document
        const doc = new IndexedDocument(
            this._id,
            {
                ...this._fields,
                // Ensure fields match IndexedDocument requirements
                title: this._fields.title,
                content: this._fields.content,
                author: this._fields.author,
                tags: [...this._fields.tags]
            },
            this._metadata
        );

        // Add additional properties
        doc.content = { ...this._content };
        doc.versions = [...this._versions];
        doc.relations = [...this._relations];

        // Add bound methods
        Object.defineProperties(doc, {
            normalizeFields: { value: this.normalizeFields.bind(this) },
            normalizeMetadata: { value: this.normalizeMetadata.bind(this) },
            getField: { value: this.getField.bind(this) },
            setField: { value: this.setField.bind(this) },
            clone: { value: () => this.clone().toIndexedDocument() },
            update: { value: (updates: Partial<IndexedDocument>) => this.update(updates) },
            toObject: { value: () => this.toObject().toIndexedDocument() },
            document: { value: () => this.document() },
            toJSON: { value: () => this.toJSON() }
        });

        return doc;
    }

    private addVersion(version: DocumentVersion): void {
        this._versions = [...this._versions, version];
    }

    // Static methods
    static async initialize(config: NexusDocumentPluginConfig = {}): Promise<void> {
        const defaultConfig = this.getDefaultConfig();
        this.config = {
            ...defaultConfig,
            ...config,
            versioning: { ...defaultConfig.versioning, ...config.versioning },
            validation: { ...defaultConfig.validation, ...config.validation }
        };

        this.searchEngine = new SearchEngine({
            name: this.config.name,
            version: this.config.version,
            fields: this.config.fields,
            storage: this.config.storage
        });

        await this.searchEngine.initialize();
    }

    private static getDefaultConfig(): Required<NexusDocumentPluginConfig> {
        return {
            name: 'nexus-document',
            version: 1,
            fields: ['title', 'content', 'type', 'tags', 'category', 'author', 'created', 'modified', 'status', 'version'],
            storage: { type: 'memory' },
            versioning: {
                enabled: true,
                maxVersions: 10
            },
            validation: {
                required: ['title', 'content', 'type', 'author'],
                customValidators: {}
            }
        };
    }

    static async search(query: string, options: AdvancedSearchOptions = {}): Promise<SearchResult<NexusDocumentAdapter>[]> {
        const results = await this.searchEngine.search(query, options);
        return results.map(result => ({
            ...result,
            item: new NexusDocumentAdapter(result.item as unknown as NexusDocument)
        }));
    }

    static async get(id: string): Promise<IndexedDocument> {
        const document = await this.searchEngine.getDocument(id);
        if (!document) {
            throw new Error(`Document with id '${id}' not found`);
        }
        return document;
    }

    async save(): Promise<void> {
        NexusDocumentAdapter.validateDocument(this._fields);
        await NexusDocumentAdapter.searchEngine.updateDocument(this.toIndexedDocument());
    }

    async delete(): Promise<void> {
        await NexusDocumentAdapter.searchEngine.removeDocument(this._id);
    }

    private generateId(): string {
        return `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private static validateDocument(doc: Partial<CreateDocumentOptions | NexusDocumentFields>): void {
        for (const field of this.config.validation.required || []) {
            if (!doc[field as keyof typeof doc]) {
                throw new Error(`Field '${field}' is required`);
            }
        }

        Object.entries(this.config.validation.customValidators || {}).forEach(([field, validator]) => {
            const value = doc[field as keyof typeof doc];
            if (value !== undefined && !(validator as (val: any) => boolean)(value)) {
                throw new Error(`Validation failed for field '${field}'`);
            }
        });
    }
}