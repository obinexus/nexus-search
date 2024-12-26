import { SearchEngine } from "@/core";
import { DocumentVersion, DocumentRelation, NexusDocument, AdvancedSearchOptions, CreateDocumentOptions, NexusDocumentPluginConfig } from "@/types/nexus-document";
import { IndexedDocument } from "@/storage";
import { DocumentMetadata, DocumentData, IndexableDocumentFields, SearchResult } from "@/types";

/**
 * NexusDocumentAdapter provides document management functionality with search engine integration
 */
export class NexusDocumentAdapter implements NexusDocument {
    private static searchEngine: SearchEngine;
    private static config: Required<NexusDocumentPluginConfig>;
    
    private _fields: NexusDocument['fields'];
    private _metadata: NexusDocument['metadata'];
    private _content: DocumentData;
    private _versions: DocumentVersion[];
    private _relations: DocumentRelation[];
    private readonly _id: string;

    // Property getters
    get id(): string { return this._id; }
    get fields(): NexusDocument['fields'] { return { ...this._fields }; }
    get metadata(): NexusDocument['metadata'] { return { ...this._metadata }; }
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

    // Required interface method implementations
    normalizeFields(fields?: Partial<NexusDocument['fields']>): NexusDocument['fields'] {
        const now = new Date().toISOString();
        return {
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
            locale: fields?.locale ?? '',
            customFields: fields?.customFields ?? ''
        };
    }

    normalizeMetadata(metadata?: Partial<NexusDocument['metadata']>): NexusDocument['metadata'] {
        const now = Date.now();
        return {
            indexed: metadata?.indexed || now,
            lastModified: metadata?.lastModified || now,
            checksum: metadata?.checksum,
            permissions: metadata?.permissions,
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

    // Core interface implementation
    clone(): this {
        return new NexusDocumentAdapter(this) as this;
    }

    update(updates: Partial<IndexedDocument>): IndexedDocument {
        const updated = new NexusDocumentAdapter({
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

        // Handle versioning
        if (updates.fields?.content && updates.fields.content !== this._fields.content) {
            updated._versions = [
                ...this._versions,
                {
                    version: Number(this._fields.version),
                    content: this._fields.content,
                    modified: new Date(),
                    author: this._fields.author
                }
            ];
        }

        return updated;
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
            relations: this._relations
        };
    }

   

    toIndexedDocument(): IndexedDocument {
        const doc = new IndexedDocument(
            this._id,
            this._fields,
            this._metadata
        );

        // Add required properties and methods
        doc.content = this._content;
        doc.versions = [...this._versions];
        doc.relations = [...this._relations];

        // Add method bindings
        Object.defineProperties(doc, {
            normalizeFields: { value: this.normalizeFields.bind(this) },
            normalizeMetadata: { value: this.normalizeMetadata.bind(this) },
            getField: { value: this.getField.bind(this) },
            setField: { value: this.setField.bind(this) },
            clone: { value: () => this.clone() },
            update: { value: (updates: Partial<IndexedDocument>) => this.update(updates) },
            toObject: { value: () => this.toObject() },
            document: { value: () => this.document() },
            toJSON: { value: () => this.toJSON() }
        });

        return doc;
    }

    // Static initialization and factory methods
    static async initialize(config: NexusDocumentPluginConfig = {}): Promise<void> {
        this.config = {
            name: config.name || 'nexus-document',
            version: config.version || 1,
            fields: config.fields || ['title', 'content', 'type', 'tags', 'category', 'author', 'created', 'modified', 'status', 'version'],
            storage: config.storage || { type: 'memory' },
            versioning: {
                enabled: true,
                maxVersions: 10,
                ...config.versioning
            },
            validation: {
                required: ['title', 'content', 'type', 'author'],
                customValidators: {},
                ...config.validation
            }
        };

        this.searchEngine = new SearchEngine({
            name: this.config.name,
            version: this.config.version,
            fields: this.config.fields,
            storage: this.config.storage
        });

        await this.searchEngine.initialize();
    }

    // Helper methods remain the same

    // Public methods remain the same
    async save(): Promise<void> {
        NexusDocumentAdapter.validateDocument(this._fields);
        await NexusDocumentAdapter.searchEngine.updateDocument(this.toIndexedDocument());
    }

    async delete(): Promise<void> {
        await NexusDocumentAdapter.searchEngine.removeDocument(this._id);
    }

    static async search(query: string, options: AdvancedSearchOptions = {}): Promise<SearchResult> {
        return this.searchEngine.search(query, options);
    }
    // Helper Methods
    private generateId(): string {
        return `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private static generateChecksum(content: string): string {
        return Array.from(content)
            .reduce((sum, char) => sum + char.charCodeAt(0), 0)
            .toString(16);
    }

    private static validateDocument(doc: Partial<CreateDocumentOptions | NexusDocument['fields']>): void {
        for (const field of this.config.validation.required || []) {
            if (!doc[field as keyof typeof doc]) {
                throw new Error(`Field '${field}' is required`);
            }
        
           
        }

        Object.entries(this.config.validation.customValidators || {}).forEach(([field, validator]) => {
            const value = doc[field as keyof typeof doc];
            if (value && !(validator as (val: any) => boolean)(value)) {
                throw new Error(`Validation failed for field '${field}'`);
            }
        });
    }

 

    static async get(id: string): Promise<IndexedDocument> {
        return this.searchEngine.getDocument(id);
    }
}