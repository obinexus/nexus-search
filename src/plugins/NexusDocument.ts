import { SearchEngine } from "@/core";
import { 
    SearchOptions, 
    IndexedDocument, 
    DocumentMetadata, 
    SearchResult 
} from "@/types";

// Document versioning
interface DocumentVersion {
    version: number;
    content: string;
    modified: Date;
    author: string;
    changelog?: string;
}

// Document relations
interface DocumentRelation {
    sourceId: string;
    targetId: string;
    type: 'reference' | 'parent' | 'child' | 'related';
    metadata?: Record<string, any>;
}

// Enhanced plugin configuration
interface NexusDocumentPluginConfig {
    name?: string;
    version?: number;
    fields?: string[];
    storage?: {
        type: 'memory' | 'indexeddb';
        options?: Record<string, any>;
    };
    versioning?: {
        enabled: boolean;
        maxVersions?: number;
    };
    validation?: {
        required?: string[];
        customValidators?: Record<string, (value: any) => boolean>;
    };
}

// Enhanced document interface
export interface NexusDocument extends IndexedDocument {
    fields: {
        title: string;
        content: string;
        type: string;
        tags: string[];
        category?: string;
        author: string;
        created: string;  // ISO date string
        modified: string; // ISO date string
        status: 'draft' | 'published' | 'archived';
        version: number;
        locale?: string;
    };
    versions?: DocumentVersion[];
    relations?: DocumentRelation[];
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
    clone(): IndexedDocument;
    update(fields: Partial<NexusDocument['fields']>): IndexedDocument;
}

// Document creation options
interface CreateDocumentOptions {
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

// Search enhancements
interface AdvancedSearchOptions extends SearchOptions {
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

export class NexusDocumentPlugin {
    private searchEngine: SearchEngine;
    private readonly defaultConfig: Required<NexusDocumentPluginConfig> = {
        name: 'nexus-document-plugin',
        version: 1,
        fields: [
            'title', 'content', 'type', 'tags', 'category', 
            'author', 'created', 'modified', 'status', 'version'
        ],
        storage: {
            type: 'memory'
        },
        versioning: {
            enabled: true,
            maxVersions: 10
        },
        validation: {
            required: ['title', 'content', 'type', 'author'],
            customValidators: {}
        }
    };

    constructor(config: NexusDocumentPluginConfig = {}) {
        const mergedConfig = this.mergeConfig(config);
        this.searchEngine = new SearchEngine({
            name: mergedConfig.name,
            version: mergedConfig.version,
            fields: mergedConfig.fields,
            storage: mergedConfig.storage
        });
    }

    private mergeConfig(config: NexusDocumentPluginConfig): Required<NexusDocumentPluginConfig> {
        return {
            ...this.defaultConfig,
            ...config,
            validation: {
                ...this.defaultConfig.validation,
                ...config.validation
            },
            versioning: {
                ...this.defaultConfig.versioning,
                ...config.versioning
            }
        };
    }

    async initialize(): Promise<void> {
        await this.searchEngine.initialize();
    }

    private validateDocument(options: CreateDocumentOptions): void {
        const { validation } = this.defaultConfig;
        
        if (validation.required) {
            for (const field of validation.required) {
        for (const field of validation.required) {
            if (!options[field as keyof CreateDocumentOptions]) {
                throw new Error(`Field '${field}' is required`);
            }
        }

        // Run custom validators
        Object.entries(validation.customValidators).forEach(([field, validator]) => {
            const value = options[field as keyof CreateDocumentOptions];
            if (value && !validator(value)) {
                throw new Error(`Validation failed for field '${field}'`);
            }
        });
    }

    private generateChecksum(content: string): string {
        // Simple checksum implementation - replace with more robust version if needed
        return Array.from(content)
            .reduce((sum, char) => sum + char.charCodeAt(0), 0)
            .toString(16);
    }

    private createDocument(options: CreateDocumentOptions): NexusDocument {
        this.validateDocument(options);
        const now = new Date();
        const checksum = this.generateChecksum(options.content);
        
        return {
            id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fields: {
                title: options.title,
                content: options.content,
                type: options.type,
                tags: options.tags || [],
                category: options.category,
                author: options.author,
                created: now.toISOString(),
                modified: now.toISOString(),
                status: options.status || 'draft',
                version: 1,
                locale: options.locale
                status: options.status || 'draft',
                version: 1,
                locale: options.locale
            },
            versions: [],
            relations: [],
            metadata: {
                ...options.metadata,
                indexed: now.getTime(),
                lastModified: now.getTime(),
                checksum
            },
            clone(): IndexedDocument {
                return {
                    ...this,
                    fields: { ...this.fields },
                    versions: [...(this.versions || [])],
                    relations: [...(this.relations || [])],
            },
            update(fields: Partial<NexusDocument['fields']>): IndexedDocument {
                const now = new Date();
                const currentVersion = this.fields.version;
                
                // Create new version if content changes
                if (fields.content && fields.content !== this.fields.content) {
                    this.versions = this.versions || [];
                    this.versions.push({
                        version: currentVersion,
                        content: this.fields.content,
                        modified: new Date(this.fields.modified),
                        author: this.fields.author
                    });
                }

                return {
                    ...this,
                    fields: {
                        ...this.fields,
                        ...fields,
                        modified: now.toISOString(),
                        version: fields.content ? currentVersion + 1 : currentVersion
                    },
                    metadata: {
                        ...this.metadata,
                        lastModified: now.getTime(),
                        checksum: fields.content ? 
                            this.generateChecksum(fields.content) : 
                            this.metadata.checksum
                    }
                };
            },
            toObject(): IndexedDocument {
                return {
                    ...this,
                    clone: this.clone,
                    update: this.update,
                    toObject: this.toObject
                };
            }
        };
    }

    async createAndAddDocument(options: CreateDocumentOptions): Promise<NexusDocument> {
        const document = this.createDocument(options);
        await this.searchEngine.addDocuments([document]);
        return document;
    }

    async search(query: string, options?: AdvancedSearchOptions): Promise<SearchResult<NexusDocument>[]> {
        let finalQuery = query;
        const searchOptions: SearchOptions = { ...options };

        // Apply filters if provided
        if (options?.filters) {
            const filterQueries: string[] = [];
            
            if (options.filters.status?.length) {
                filterQueries.push(`status:(${options.filters.status.join(' OR ')})`);
            }
            
            if (options.filters.categories?.length) {
                filterQueries.push(`category:(${options.filters.categories.join(' OR ')})`);
            }
            
            if (options.filters.types?.length) {
                filterQueries.push(`type:(${options.filters.types.join(' OR ')})`);
            }
            
            if (options.filters.authors?.length) {
                filterQueries.push(`author:(${options.filters.authors.join(' OR ')})`);
            }

            if (options.filters.dateRange) {
                filterQueries.push(
                    `created:[${options.filters.dateRange.start.toISOString()} TO ${options.filters.dateRange.end.toISOString()}]`
                );
            }

            if (filterQueries.length) {
                finalQuery = `${query} AND ${filterQueries.join(' AND ')}`;
            }
        }

        return this.searchEngine.search<NexusDocument>(finalQuery, searchOptions);
    }

    async searchByType(type: string): Promise<SearchResult<NexusDocument>[]> {
        return this.search(`type:${type}`);
    }

    async searchByCategory(category: string): Promise<SearchResult<NexusDocument>[]> {
        return this.search(`category:${category}`);
    }

    async searchByTags(tags: string[]): Promise<SearchResult<NexusDocument>[]> {
        const tagQuery = tags.map(tag => `tags:${tag}`).join(' OR ');
        return this.search(tagQuery);
    }

    async getDocument(id: string): Promise<NexusDocument | undefined> {
        return this.searchEngine.getDocumentById(id) as NexusDocument | undefined;
    }

    async getDocumentVersion(id: string, version: number): Promise<DocumentVersion | undefined> {
        const document = await this.getDocument(id);
        return document?.versions?.find(v => v.version === version);
    }

    async updateDocument(id: string, updates: Partial<NexusDocument['fields']>): Promise<NexusDocument> {
        const document = await this.getDocument(id);
        if (!document) {
            throw new Error(`Document with id ${id} not found`);
        }

        const updatedDocument = document.update(updates) as NexusDocument;
        await this.searchEngine.updateDocument(updatedDocument);
        return updatedDocument;
    }

    async addDocumentRelation(relation: DocumentRelation): Promise<void> {
        const sourceDoc = await this.getDocument(relation.sourceId);
        if (!sourceDoc) {
            throw new Error(`Source document ${relation.sourceId} not found`);
        }

        const targetDoc = await this.getDocument(relation.targetId);
        if (!targetDoc) {
            throw new Error(`Target document ${relation.targetId} not found`);
        }

        sourceDoc.relations = sourceDoc.relations || [];
        sourceDoc.relations.push(relation);
        await this.searchEngine.updateDocument(sourceDoc);
    }

    async getRelatedDocuments(id: string, type?: DocumentRelation['type']): Promise<NexusDocument[]> {
        const document = await this.getDocument(id);
        if (!document) {
            throw new Error(`Document ${id} not found`);
        }

        const relatedIds = document.relations
            ?.filter(rel => !type || rel.type === type)
            .map(rel => rel.targetId) || [];

        const relatedDocs = await Promise.all(
            relatedIds.map(id => this.getDocument(id))
        );

        return relatedDocs.filter((doc): doc is NexusDocument => !!doc);
    }

    async deleteDocument(id: string): Promise<void> {
        await this.searchEngine.removeDocument(id);
    }

    async bulkAddDocuments(documents: CreateDocumentOptions[]): Promise<NexusDocument[]> {
        const createdDocuments = documents.map(doc => this.createDocument(doc));
        await this.searchEngine.addDocuments(createdDocuments);
        return createdDocuments;
    }

    async clear(): Promise<void> {
        await this.searchEngine.clearIndex();
    }

    async exportDocuments(): Promise<NexusDocument[]> {
        return this.searchEngine.getAllDocuments() as NexusDocument[];
    }

    async importDocuments(documents: NexusDocument[]): Promise<void> {
        await this.searchEngine.addDocuments(documents);
    }

    async getStats(): Promise<{
        totalDocuments: number;
        documentsByType: Record<string, number>;
        documentsByCategory: Record<string, number>;
        documentsByStatus: Record<string, number>;
        documentsByAuthor: Record<string, number>;
        averageVersionsPerDocument: number;
    }> {
        const documents = await this.exportDocuments();
        
        const stats = documents.reduce((acc, doc) => {
            // Count by type
            acc.documentsByType[doc.fields.type] = (acc.documentsByType[doc.fields.type] || 0) + 1;
            
            // Count by category
            if (doc.fields.category) {
                acc.documentsByCategory[doc.fields.category] = 
                    (acc.documentsByCategory[doc.fields.category] || 0) + 1;
            }
            
            // Count by status
            acc.documentsByStatus[doc.fields.status] = 
                (acc.documentsByStatus[doc.fields.status] || 0) + 1;
            
            // Count by author
            acc.documentsByAuthor[doc.fields.author] = 
                (acc.documentsByAuthor[doc.fields.author] || 0) + 1;
            
            // Sum versions
            acc.totalVersions += (doc.versions?.length || 0);
            
            return acc;
        }, {
            documentsByType: {},
            documentsByCategory: {},
            documentsByStatus: {},
            documentsByAuthor: {},
            totalVersions: 0
        } as Record<string, any>);

        return {
            totalDocuments: documents.length,
            documentsByType: stats.documentsByType,
            documentsByCategory: stats.documentsByCategory,
            documentsByStatus: stats.documentsByStatus,
            documentsByAuthor: stats.documentsByAuthor,
            averageVersionsPerDocument: documents.length ? 
                stats.totalVersions / documents.length : 0
        };
    }
}