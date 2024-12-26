import { SearchEngine } from "@/core";
import { DocumentVersion, DocumentRelation, NexusDocument, AdvancedSearchOptions, CreateDocumentOptions, NexusDocumentPluginConfig } from "@/plugins/NexusDocument";
import { IndexedDocument } from "@/storage";
import {  DocumentData, IndexableDocumentFields, SearchResult } from "@/types";

/**
 * NexusDocumentAdapter provides document management functionality with search engine integration
 */
export class NexusDocumentAdapter implements NexusDocument {
    private static searchEngine: SearchEngine;
    private static config: Required<NexusDocumentPluginConfig>;
    
    readonly id: string;
    readonly fields: NexusDocument['fields'];
    readonly metadata: NexusDocument['metadata'];
    readonly versions: DocumentVersion[];
    readonly relations: DocumentRelation[];
    readonly content: DocumentData;

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
            },
        
            toJSON(): Record<string, any> {
                return {
                    id: this.id,
                    fields: this.fields,
                    metadata: this.metadata,
                    versions: this.versions,
                    relations: this.relations
                };
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

    constructor(doc: Partial<NexusDocument>) {
        this.id = doc.id || this.generateId();
        this.fields = this.normalizeFields(doc.fields);
        this.metadata = this.normalizeMetadata(doc.metadata);
        this.versions = doc.versions || [];
        this.relations = doc.relations || [];
        this.content = this.normalizeContent();
    }

    private normalizeFields(fields?: Partial<NexusDocument['fields']>): NexusDocument['fields'] {
        const now = new Date().toISOString();
        return {
            title: fields?.title || '',
            content: fields?.content || '',
            type: fields?.type || '',
            tags: fields?.tags || [],
            category: fields?.category || '',
            author: fields?.author || '',
            created: fields?.created || now,
            modified: fields?.modified || now,
            status: fields?.status || 'draft',
            version: fields?.version || '1',
            locale: fields?.locale
        };
    }

    private normalizeMetadata(metadata?: Partial<NexusDocument['metadata']>): NexusDocument['metadata'] {
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
            ...this.fields,
            metadata: this.metadata
        };
    }

    // Factory Methods
    static async create(options: CreateDocumentOptions): Promise<NexusDocumentAdapter> {
        this.validateDocument(options);
        const adapter = new NexusDocumentAdapter({
            fields: {
                ...options,
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                version: '1'
            },
            metadata: {
                indexed: Date.now(),
                lastModified: Date.now(),
                checksum: this.generateChecksum(options.content)
            }
        });

        await this.searchEngine.addDocuments([adapter.toIndexedDocument()]);
        return adapter;
    }

    static async search(query: string, options?: AdvancedSearchOptions): Promise<SearchResult<NexusDocumentAdapter>[]> {
        const searchOptions = this.buildSearchOptions(options);
        const results = await this.searchEngine.search(query, searchOptions);
        
        return results.map(result => ({
            ...result,
            item: new NexusDocumentAdapter(result.item as NexusDocument)
        }));
    }

    private static buildSearchOptions(options?: AdvancedSearchOptions): AdvancedSearchOptions {
        if (!options?.filters) return options || {};

        const filterQueries: string[] = [];
        const { filters } = options;

        if (filters.status?.length) {
            filterQueries.push(`status:(${filters.status.join(' OR ')})`);
        }
        if (filters.categories?.length) {
            filterQueries.push(`category:(${filters.categories.join(' OR ')})`);
        }
        if (filters.types?.length) {
            filterQueries.push(`type:(${filters.types.join(' OR ')})`);
        }
        if (filters.authors?.length) {
            filterQueries.push(`author:(${filters.authors.join(' OR ')})`);
        }
        if (filters.dateRange) {
            filterQueries.push(
                `created:[${filters.dateRange.start.toISOString()} TO ${filters.dateRange.end.toISOString()}]`
            );
        }

        return {
            ...options,
            filters: undefined,
            query: filterQueries.length ? filterQueries.join(' AND ') : undefined
        };
    }

    // Instance Methods
    async save(): Promise<void> {
        NexusDocumentAdapter.validateDocument(this.fields);
        await NexusDocumentAdapter.searchEngine.updateDocument(this.toIndexedDocument());
    }

    async delete(): Promise<void> {
        await NexusDocumentAdapter.searchEngine.removeDocument(this.id);
    }

    // Document Relations
    async addRelation(relation: DocumentRelation): Promise<void> {
        const targetDoc = await NexusDocumentAdapter.searchEngine.getDocument(relation.targetId);
        if (!targetDoc) {
            throw new Error(`Target document ${relation.targetId} not found`);
        }

        this.relations.push(relation);
        await this.save();
    }

    async getRelatedDocuments(type?: DocumentRelation['type']): Promise<NexusDocumentAdapter[]> {
        const relatedIds = this.relations
            .filter(rel => !type || rel.type === type)
            .map(rel => rel.targetId);

        const docs = await Promise.all(
            relatedIds.map(id => NexusDocumentAdapter.searchEngine.getDocument(id))
        );

        return docs
            .filter((doc): doc is IndexedDocument => !!doc)
            .map(doc => new NexusDocumentAdapter(doc as NexusDocument));
    }

    // Interface Implementation
    clone(): this {
        return new NexusDocumentAdapter(this) as this;
    }

    update(updates: Partial<Omit<IndexedDocument, 'fields'>> & { fields?: Partial<IndexableDocumentFields> }): this {
        const updated = new NexusDocumentAdapter({
            ...this,
            fields: {
                ...this.fields,
                ...(updates.fields || {}),
                modified: new Date().toISOString()
            },
            metadata: {
                ...this.metadata,
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

        return updated as this;
    }

    toObject(): this {
        return this;
    }
    toJSON(): Record<string, any> {
        return {
            id: this.id,
            fields: this.fields,
            metadata: this.metadata,
            versions: this.versions,
            relations: this.relations
        };
    }

    toIndexedDocument(): IndexedDocument {
        return {
            id: this.id,
            fields: this.fields,
            metadata: this.metadata,
            setField: (key, value) => this.setField(key, value),
            toJSON: () => this.toJSON(),
            versions: this.versions,
            relations: this.relations,
            clone: () => this.clone() as unknown as IndexedDocument,
            update: (updates: Partial<IndexedDocument>) => this.update(updates) as unknown as IndexedDocument,
            toObject: () => this.toObject() as unknown as IndexedDocument,
            document: () => this as unknown as IndexedDocument
        };
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

    getField<T extends keyof IndexableDocumentFields>(field: T): IndexableDocumentFields[T] {
        return this.fields[field];
    }

    setField<T extends keyof IndexableDocumentFields>(field: T, value: IndexableDocumentFields[T]): void {
        (this.fields as any)[field] = value;
    }

    document(): IndexedDocument {
        return this.toIndexedDocument();
    }
}