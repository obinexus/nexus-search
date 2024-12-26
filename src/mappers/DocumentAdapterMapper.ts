import { SearchEngine } from "@/core";
import { DocumentVersion, DocumentRelation, NexusDocument, AdvancedSearchOptions, CreateDocumentOptions } from "@/plugins/NexusDocument";
import { IndexedDocument } from "@/storage";
import { DocumentMetadata, DocumentData, IndexableDocumentFields, SearchResult, DocumentConfig } from "@/types";



/**
 * Enhanced document adapter incorporating all NexusDocument functionality
 */
export class DocumentAdapter extends IndexedDocument {
    private static searchEngine: SearchEngine;
    private static config: Required<DocumentConfig>;

    readonly id: string;
    readonly fields: IndexableDocumentFields & {
        [key: string]: string | number | boolean | string[] | null;
        title: string;
        content: string;
        author: string;
        tags: string[];
    };
    readonly metadata: DocumentMetadata;
    readonly versions: DocumentVersion[];
    readonly relations: DocumentRelation[];
    readonly content: DocumentData;

    // Initialize static configuration and search engine
    static async initialize(config: DocumentConfig = {}): Promise<void> {
        this.config = {
            fields: ['title', 'content', 'type', 'tags', 'category', 'author', 'created', 'modified', 'status', 'version'],
            storage: { type: 'memory' },
            versioning: { enabled: true, maxVersions: 10 },
            validation: {
                required: ['title', 'content', 'type', 'author'],
                customValidators: {}
            },
            ...config
        };

        this.searchEngine = new SearchEngine({
            name: 'nexus-document-system',
            version: 1,
            fields: this.config.fields,
            storage: this.config.storage
        });

        await this.searchEngine.initialize();
    }

    constructor(doc: Partial<NexusDocument>) {
        super(doc.id || '', doc.fields || {}, doc.metadata || {});
        this.id = doc.id || this.generateId();
        this.fields = this.normalizeInitialFields(doc.fields);
        this.metadata = this.normalizeInitialMetadata(doc.metadata);
        this.versions = doc.versions || [];
        this.relations = doc.relations || [];
        this.content = this.normalizeContent();
    }

    // Static factory methods
    static async create(options: CreateDocumentOptions): Promise<DocumentAdapter> {
        const now = new Date();
        const adapter = new DocumentAdapter({
            id: '',
            fields: {
                ...options,
                created: now.toISOString(),
                modified: now.toISOString(),
                version: '1',
                status: options.status || 'draft'
            },
            metadata: {
                indexed: now.getTime(),
                lastModified: now.getTime(),
                checksum: this.generateChecksum(options.content)
            }
        });

        await this.searchEngine.addDocuments([adapter]);
        return adapter;
    }

    static async bulkCreate(documents: CreateDocumentOptions[]): Promise<DocumentAdapter[]> {
        const adapters = documents.map(doc => new DocumentAdapter({
            id: '',
            fields: {
                ...doc,
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                version: '1',
                status: doc.status || 'draft'
            }
        }));
        const indexedDocuments = adapters.map(adapter => adapter.toObject());

        await this.searchEngine.addDocuments(indexedDocuments);

        return adapters;
    }

    static async findById(id: string): Promise<DocumentAdapter | undefined> {
        const doc = await this.searchEngine.getDocument(id);
        return doc ? new DocumentAdapter(doc as NexusDocument) : undefined;
    }

    static async search(query: string, options?: AdvancedSearchOptions): Promise<SearchResult<DocumentAdapter>[]> {
        const results = await this.searchEngine.search(query, {
            ...options,
            // Add advanced filtering logic here
        });

        return results.map(result => ({
            ...result,
            item: new DocumentAdapter(result.item as NexusDocument)
        }));
    }

    // Instance methods for document operations
    async save(): Promise<void> {
        this.validateDocument();
        await DocumentAdapter.searchEngine.updateDocument(this as unknown as IndexedDocument);
    }

    async delete(): Promise<void> {
        await DocumentAdapter.searchEngine.removeDocument(this.id);
    }

    async addRelation(relation: DocumentRelation): Promise<void> {
        const targetDoc = await DocumentAdapter.findById(relation.targetId);
        if (!targetDoc) {
            throw new Error(`Target document ${relation.targetId} not found`);
        }

        this.relations.push(relation);
        await this.save();
    }

    async getRelatedDocuments(type?: DocumentRelation['type']): Promise<DocumentAdapter[]> {
        const relatedIds = this.relations
            .filter(rel => !type || rel.type === type)
            .map(rel => rel.targetId);

        const docs = await Promise.all(
            relatedIds.map(id => DocumentAdapter.findById(id))
        );

        return docs.filter((doc): doc is DocumentAdapter => !!doc);
    }

    // Helper methods
    private generateId(): string {
        return `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private static generateChecksum(content: string): string {
        return Array.from(content)
            .reduce((sum, char) => sum + char.charCodeAt(0), 0)
            .toString(16);
    }

    public normalizeInitialFields(fields?: Partial<NexusDocument['fields']>): IndexableDocumentFields & {
        [key: string]: string | number | boolean | string[] | null;
        title: string;
        content: string;
        author: string;
        tags: string[];
    } {
        return {
            title: fields?.title || '',
            content: fields?.content || '',
            author: fields?.author || '',
            tags: fields?.tags || [],
            version: String(fields?.version || '1'),
            modified: fields?.modified || new Date().toISOString(),
            type: fields?.type || '',
            category: fields?.category || '',
            status: fields?.status || 'draft',
            locale: fields?.locale || '',
            created: fields?.created || new Date().toISOString()
        } as IndexableDocumentFields & {
            [key: string]: string | number | boolean | string[] | null;
            title: string;
            content: string;
            author: string;
            tags: string[];
        };
    }

    private normalizeInitialMetadata(metadata?: DocumentMetadata): DocumentMetadata {
        const now = Date.now();
        return {
            indexed: metadata?.indexed || now,
            lastModified: metadata?.lastModified || now,
            ...metadata
        };
    }

    private validateDocument(): void {
        const config = DocumentAdapter.config;
        
        for (const field of config.validation.required || []) {
            if (!this.fields[field as keyof typeof this.fields]) {
                throw new Error(`Field '${field}' is required`);
            }
        }

        Object.entries(config.validation.customValidators || {}).forEach(([field, validator]) => {
            const value = this.fields[field as keyof typeof this.fields];
            if (value && !validator(value)) {
                throw new Error(`Validation failed for field '${field}'`);
            }
        });
    }

    // Interface implementation methods
    private normalizeContent(): DocumentData {
        return {
            ...this.fields,
            metadata: this.metadata
        };
    }

    public normalizeFields(fields: IndexableDocumentFields): IndexableDocumentFields & {
        [key: string]: string | number | boolean | string[] | null;
        title: string;
        content: string;
        author: string;
        tags: string[];
    } {
        return this.normalizeInitialFields(fields);
    }

    normalizeMetadata(metadata?: DocumentMetadata): DocumentMetadata {
        return this.normalizeInitialMetadata(metadata);
    }

    getField<T extends keyof IndexableDocumentFields>(field: T): IndexableDocumentFields[T] {
        return this.fields[field];
    }

    setField<T extends keyof IndexableDocumentFields>(field: T, value: IndexableDocumentFields[T]): void {
        (this.fields as any)[field] = value;
    }

    document(): IndexedDocument {
        return this;
    }

    clone(): IndexedDocument {
        return new DocumentAdapter(this);
    }

    update(updates: Partial<IndexedDocument>): IndexedDocument {
        const updatedFields: IndexableDocumentFields & {
            [key: string]: string | number | boolean | string[] | null;
            title: string;
            content: string;
            author: string;
            tags: string[];
        } = {
            ...this.fields,
            ...(updates.fields || {}),
            modified: new Date().toISOString()
        } as IndexableDocumentFields & {
            [key: string]: string | number | boolean | string[] | null;
            title: string;
            content: string;
            author: string;
            tags: string[];
        };
    
        const updated = new DocumentAdapter({
            ...this,
            fields: updatedFields,
            metadata: {
                ...this.metadata,
                ...updates.metadata,
                lastModified: Date.now()
            }
        });
    
        if (updates.fields?.content && updates.fields.content !== this.fields.content) {
            updated.versions.push({
                version: Number(this.fields.version),
                content: this.fields.content,
                modified: new Date(),
                author: this.fields.author
            });
        }
    
        return updated;
    }

    toObject(): IndexedDocument {
        return {
            id: this.id,
            fields: this.normalizeFields(this.fields),
            update: (updates) => this.update(updates),
            toJSON: () => this.toJSON(),
            versions: [...this.versions],
            relations: [...this.relations],
            content: { ...this.content },
            document: () => this.document(),
            clone: () => this.clone(),
            update: (updates) => this.update(updates),
            toObject: () => this.toObject(),
            normalizeFields: (fields) => this.normalizeFields(fields),
            normalizeMetadata: (metadata) => this.normalizeMetadata(metadata),
            getField: (key) => this.getField(key as keyof IndexableDocumentFields),
            setField: (key, value) => this.setField(key as keyof IndexableDocumentFields, value)
        };
    }

    toJSON(): Record<string, any> {
        return {
            id: this.id,
            fields: this.fields,
            metadata: this.metadata,
            versions: this.versions,
            relations: this.relations,
            content: this.content
        };
    }

    toString(): string {
        return JSON.stringify(this.toJSON(), null, 2);
    }
}