import { SearchEngine } from "@/core";
import { 
    DocumentVersion, 
    DocumentRelation, 
    NexusDocument, 
    AdvancedSearchOptions,
    CreateDocumentOptions,
    NexusDocumentMetadata,
    NexusFields,
    IndexedDocument,
    SearchResult,
    DocumentContent,
    DocumentStatus
} from "@/types";

// Add interface for plugin config if not in types
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
export class NexusDocumentAdapter implements NexusDocument {
    private static searchEngine: SearchEngine;
    private static config: Required<NexusDocumentPluginConfig>;

    private readonly _id: string;
    private _fields: NexusFields;
    private _metadata: NexusDocumentMetadata;
    private _versions: DocumentVersion[];
    private _relations: DocumentRelation[];
    private _content?: Record<string, any>;

    get id(): string { return this._id; }
    get fields(): NexusFields { return { ...this._fields }; }
    get metadata(): NexusDocumentMetadata { return { ...this._metadata }; }
    get versions(): DocumentVersion[] { return [...this._versions]; }
    get relations(): DocumentRelation[] { return [...this._relations]; }
    get content(): Record<string, any> | undefined { return this._content ? { ...this._content } : undefined; }

    constructor(doc: Partial<NexusDocument> & { id?: string }) {
        this._id = doc.id || this.generateId();
        this._fields = this.normalizeFields(doc.fields);
        this._metadata = this.normalizeMetadata(doc.metadata);
        this._versions = doc.versions || [];
        this._relations = doc.relations || [];
        this._content = doc.content;
    }

    private normalizeFields(fields?: Partial<NexusFields>): NexusFields {
        const now = new Date().toISOString();
        return {
            title: fields?.title || '',
            content: this.normalizeContent(fields?.content),
            type: fields?.type || 'document',
            tags: Array.isArray(fields?.tags) ? [...fields.tags] : [],
            category: fields?.category || '',
            author: fields?.author || '',
            created: fields?.created || now,
            modified: fields?.modified || now,
            status: fields?.status || 'draft',
            version: fields?.version || '1.0',
            locale: fields?.locale || ''
        };
    }

    private normalizeMetadata(metadata?: Partial<NexusDocumentMetadata>): NexusDocumentMetadata {
        const now = Date.now();
        return {
            indexed: metadata?.indexed ?? now,
            lastModified: metadata?.lastModified ?? now,
            checksum: metadata?.checksum,
            permissions: metadata?.permissions || [],
            workflow: metadata?.workflow
        };
    }

    private normalizeContent(content?: DocumentContent | string): DocumentContent {
        if (typeof content === 'string') {
            return { text: content };
        }
        return content || {};
    }

    clone(): NexusDocument {
        return new NexusDocumentAdapter({
            id: this._id,
            fields: { ...this._fields },
            metadata: { ...this._metadata },
            versions: [...this._versions],
            relations: [...this._relations],
            content: this._content ? { ...this._content } : undefined
        });
    }

    update(updates: Partial<NexusDocument>): NexusDocument {
        const newFields = updates.fields ? {
            ...this._fields,
            ...updates.fields,
            modified: new Date().toISOString()
        } : this._fields;

        const newMetadata = updates.metadata ? {
            ...this._metadata,
            ...updates.metadata,
            lastModified: Date.now()
        } : this._metadata;

        // Handle versioning if content changes
        const versions = [...this._versions];
        if (updates.fields?.content && updates.fields.content !== this._fields.content) {
            versions.push({
                version: versions.length + 1,
                content: this._fields.content,
                modified: new Date(),
                author: this._fields.author
            });
        }

        return new NexusDocumentAdapter({
            id: this._id,
            fields: newFields,
            metadata: newMetadata,
            versions,
            relations: updates.relations || this._relations,
            content: updates.content
        });
    }

    document(): IndexedDocument {
        return {
            id: this._id,
            fields: this._fields,
            metadata: this._metadata,
            versions: this._versions,
            relations: this._relations,
            document: () => this.document()
        };
    }

    toObject(): NexusDocument {
        return {
            id: this._id,
            fields: this._fields,
            metadata: this._metadata,
            versions: this._versions,
            relations: this._relations,
            document: () => this.document(),
            clone: () => this.clone(),
            update: (updates) => this.update(updates),
            toObject: () => this.toObject()
        };
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
            storage: this.config.storage,
            documentSupport: {
                enabled: true,
                versioning: this.config.versioning,
                validation: this.config.validation
            }
        });

        await this.searchEngine.initialize();
    }

    private static getDefaultConfig(): Required<NexusDocumentPluginConfig> {
        return {
            name: 'nexus-document',
            version: 1,
            fields: ['title', 'content', 'type', 'tags', 'category', 'author'],
            storage: { type: 'memory' },
            versioning: {
                enabled: true,
                maxVersions: 10
            },
            validation: {
                required: ['title', 'content'],
                customValidators: {}
            }
        };
    }

    static async search(query: string, options: AdvancedSearchOptions = {}): Promise<SearchResult<NexusDocument>[]> {
        const results = await this.searchEngine.search(query, options);
        return results.map(result => ({
            ...result,
            item: new NexusDocumentAdapter(result.item as Partial<NexusDocument>)
        }));
    }

    static async create(options: CreateDocumentOptions): Promise<NexusDocument> {
        this.validateDocument(options);
        const doc = new NexusDocumentAdapter({
            fields: {
                ...options,
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                version: '1.0',
                status: options.status || 'draft'
            }
        });
        await doc.save();
        return doc;
    }

    static async get(id: string): Promise<NexusDocument> {
        const doc = await this.searchEngine.getDocument(id);
        if (!doc) {
            throw new Error(`Document ${id} not found`);
        }
        return new NexusDocumentAdapter(doc as Partial<NexusDocument>);
    }

    async save(): Promise<void> {
        NexusDocumentAdapter.validateDocument(this._fields);
        await NexusDocumentAdapter.searchEngine.updateDocument(this.document());
    }

    async delete(): Promise<void> {
        await NexusDocumentAdapter.searchEngine.removeDocument(this._id);
    }

    private generateId(): string {
        return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }

    private static validateDocument(doc: Partial<CreateDocumentOptions | NexusFields>): void {
        const { required = [], customValidators = {} } = this.config.validation;

        for (const field of required) {
            if (!doc[field as keyof typeof doc]) {
                throw new Error(`Field '${field}' is required`);
            }
        }

        for (const [field, validator] of Object.entries(customValidators)) {
            const value = doc[field as keyof typeof doc];
            if (value !== undefined && !validator(value)) {
                throw new Error(`Validation failed for field '${field}'`);
            }
        }
    }
}