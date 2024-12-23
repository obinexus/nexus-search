/**
 * NexusDocument Plugin for search and document management
 * 
 * @module NexusDocument
 */

import { SearchEngine } from "@/core";
import { DocumentAdapter } from "@/mappers/DocumentAdapterMapper";
import { BaseDocument, IndexedDocument,  } from "@/storage";
import { 
    SearchOptions, 
    IndexedDocument, 
    DocumentMetadata, 
    SearchResult 
} from "@/types";

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
    clone(): this;
    update(fields: Partial<this['fields']>): this;
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

/**
 * NexusDocument Plugin
 * Provides document management and search capabilities with versioning and relations
 */
export class NexusDocumentPlugin {
    private searchEngine: SearchEngine;
    private readonly defaultConfig: Required<NexusDocumentPluginConfig> = {
        name: 'nexus-document-plugin',
        version: '1',
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

    /**
     * Creates a new NexusDocument plugin instance
     * @param config Plugin configuration options
     */
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

    /** Initialize the plugin and storage */
    async initialize(): Promise<void> {
        await this.searchEngine.initialize();
    }

    private validateDocument(options: CreateDocumentOptions): void {
        const { validation } = this.defaultConfig;
        
        // Check required fields
        for (const field of validation.required || []) {
            if (!options[field as keyof CreateDocumentOptions]) {
                throw new Error(`Field '${field}' is required`);
            }
        }

        // Run custom validators
        Object.entries(validation.customValidators || {}).forEach(([field, validator]) => {
            const value = options[field as keyof CreateDocumentOptions];
            if (value && !validator(value)) {
                throw new Error(`Validation failed for field '${field}'`);
            }
        });
    }

    private generateChecksum(content: string): string {
        return Array.from(content)
            .reduce((sum, char) => sum + char.charCodeAt(0), 0)
            .toString(16);
    }

    private createDocument(options: CreateDocumentOptions): IndexedDocument {

        this.validateDocument(options);
    
        const now = new Date();
    
        
    
        const doc = new BaseDocument({
    
            id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    
            fields: {
    
                title: options.title,
    
                content: options.content,
    
                type: options.type,
    
                tags: options.tags || [],
    
                category: options.category || '',
    
                author: options.author,
    
                created: now.toISOString(),
    
                modified: now.toISOString(),
    
                status: options.status || 'draft',
    
                version: 1,
    
                locale: options.locale
    
            },
    
            metadata: {
    
                ...options.metadata,
    
                indexed: now.getTime(),
    
                lastModified: now.getTime(),
    
                checksum: this.generateChecksum(options.content)
    
            }
    
        });
    
    
    
        return Object.assign(doc, {
    
            clone: function() { return this; },
    
            update: function(fields: any) {
                Object.assign(this.fields, fields);
                return this;
            }
    
        });
    }    

    /**
     * Create and index a new document
     * @param options Document creation options
     * @returns Created document
     */
    async createAndAddDocument(options: CreateDocumentOptions): Promise<NexusDocument> {
        const document = this.createDocument(options);
        const indexedDoc = new IndexedDocument(
            document.id,
            {
                ...document.fields,
                version: String(document.fields.version)
            },
            document.metadata
        );
        const nexusDoc: NexusDocument = {
            ...document,
            fields: {
                title: document.fields.title,
                content: document.fields.content,
                type: document.fields.type,
                tags: document.fields.tags || [],
                category: typeof document.fields.category === 'string' ? document.fields.category : undefined,
                author: document.fields.author,
                created: document.fields.created,
                modified: document.fields.modified,
                status: document.fields.status as 'draft' | 'published' | 'archived',
                version: Number(document.fields.version),
                locale: document.fields.locale
            },
            versions: [],
            relations: [],
            clone: function() { return this; },
            update: function(fields) { return Object.assign(this, { fields: { ...this.fields, ...fields } }); },
            toObject: function() { return this; }
        };
        await this.searchEngine.addDocuments([indexedDoc]);
        return nexusDoc;
    }

    /**
     * Search documents with advanced filtering
     * @param query Search query string
     * @param options Advanced search options
     * @returns Search results
     */
    async search(query: string, options?: AdvancedSearchOptions): Promise<SearchResult<NexusDocument>[]> {
        let finalQuery = query;
        const searchOptions: SearchOptions = { ...options };

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

        return this.searchEngine.search(finalQuery, searchOptions);
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

    /**
     * Get document by ID
     * @param id Document ID
     * @returns Document if found
     */
    async getDocument(id: string): Promise<NexusDocument | undefined> {
        return this.searchEngine.getDocumentById(id) as NexusDocument | undefined;
    }

    /**
     * Get specific version of a document
     * @param id Document ID
     * @param version Version number
     * @returns Document version if found
     */
    async getDocumentVersion(id: string, version: number): Promise<DocumentVersion | undefined> {
        const document = await this.getDocument(id);
        return document?.versions?.find(v => v.version === version);
    }

   
/**
 * Update document with adapter pattern
 */
async updateDocument(id: string, updates: Partial<NexusDocument['fields']>): Promise<NexusDocument> {
    const document = await this.getDocument(id);
    if (!document) {
        throw new Error(`Document with id ${id} not found`);
    }

    const adapter = DocumentAdapter.fromNexusDocument(document);
    const processedUpdates = {
        ...updates,
        version: updates.version !== undefined ? Number(updates.version) : undefined 
    };
    const updated = adapter.update(processedUpdates);
    await this.searchEngine.updateDocument(updated);
    
    return (updated as unknown as DocumentAdapter).toNexusDocument();
}


    /**
     * Add a relationship between documents
     * @param relation Relationship definition
     */
    
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

        

        const indexedDoc = new IndexedDocument(

            sourceDoc.id,

            {

                ...sourceDoc.fields,

                version: String(sourceDoc.fields.version)

            },

            sourceDoc.metadata

        );

        await this.searchEngine.updateDocument(indexedDoc);

    }

    /**
     * Get related documents
     * @param id Document ID
     * @param type Optional relationship type filter
     * @returns Related documents
     */
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

    /**
     * Delete a document
     * @param id Document ID
     */
    async deleteDocument(id: string): Promise<void> {
        await this.searchEngine.removeDocument(id);
    }


/**

 * Fixed bulk operations with proper type handling

 */

async bulkAddDocuments(documents: CreateDocumentOptions[]): Promise<NexusDocument[]> {

    const createdDocuments = documents.map(doc => this.createDocument(doc)) as unknown as NexusDocument[];

    

    const indexableDocuments = createdDocuments.map(doc => new IndexedDocument(

        doc.id,

        {

            title: doc.fields.title,

            content: doc.fields.content,

            type: doc.fields.type,

            tags: doc.fields.tags,

            category: doc.fields.category || '',

            author: doc.fields.author,

            created: doc.fields.created,

            modified: doc.fields.modified,

            status: doc.fields.status,

            version: String(doc.fields.version),

            locale: doc.fields.locale || ''

        },

        doc.metadata

    ));

    

    await this.searchEngine.addDocuments(indexableDocuments);

    

    return createdDocuments;

}
/**
 * Fixed export with proper type casting
 */
async exportDocuments(): Promise<NexusDocument[]> {
    const docs = await this.searchEngine.getAllDocuments();
    return docs.map(doc => new BaseDocument(doc).toObject() as unknown as NexusDocument);
}
/**
 * Fixed import with proper interface handling
 */
async importDocuments(documents: NexusDocument[]): Promise<void> {
    const indexedDocs = documents.map(doc => new IndexedDocument(
        doc.id,
        {
            title: doc.fields.title,
            content: doc.fields.content,
            type: doc.fields.type,
            tags: doc.fields.tags,
            category: doc.fields.category || '',
            author: doc.fields.author,
            created: doc.fields.created,
            modified: doc.fields.modified,
            status: doc.fields.status,
            version: String(doc.fields.version),
            locale: doc.fields.locale || ''
        },
        doc.metadata
    ));
    await this.searchEngine.addDocuments(indexedDocs);
}
    /**
     * Get document statistics
     * @returns Document statistics
     */
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
            acc.documentsByType[doc.fields.type] = (acc.documentsByType[doc.fields.type] || 0) + 1;
            
            if (doc.fields.category) {
                acc.documentsByCategory[doc.fields.category] = 
                    (acc.documentsByCategory[doc.fields.category] || 0) + 1;
            }
            
            acc.documentsByStatus[doc.fields.status] = 
            (acc.documentsByStatus[doc.fields.status] || 0) + 1;
        
        acc.documentsByAuthor[doc.fields.author] = 
            (acc.documentsByAuthor[doc.fields.author] || 0) + 1;
        
        acc.totalVersions += (doc.versions?.length || 0);
        
        return acc;
    }, {
        documentsByType: {},
        documentsByCategory: {},
        documentsByStatus: {},
        documentsByAuthor: {},
        totalVersions: 0
    } as {
        documentsByType: Record<string, number>;
        documentsByCategory: Record<string, number>;
        documentsByStatus: Record<string, number>;
        documentsByAuthor: Record<string, number>;
        totalVersions: number;
    });

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


/**
 * Fixed getWorkflowStats implementation with proper type handling
 */
async getWorkflowStats(): Promise<{
    documentsByWorkflowStatus: Record<string, number>;
    documentsByAssignee: Record<string, number>;
    overdueTasks: number;
}> {
    const documents = await this.exportDocuments();
    const now = new Date();
    
    const stats = documents.reduce((acc: {
        documentsByWorkflowStatus: Record<string, number>;
        documentsByAssignee: Record<string, number>;
        overdueTasks: number;
    }, doc) => {
        if (doc.metadata.workflow) {
            // Count by workflow status
            const { status, assignee, dueDate } = doc.metadata.workflow;
            
            if (status) {
                acc.documentsByWorkflowStatus[status] = 
                    (acc.documentsByWorkflowStatus[status] || 0) + 1;
            }

            // Count by assignee
            if (assignee) {
                acc.documentsByAssignee[assignee] = 
                    (acc.documentsByAssignee[assignee] || 0) + 1;
            }

            // Check for overdue tasks
            if (dueDate) {
                const dueDateObj = new Date(dueDate);
                if (dueDateObj < now) {
                    acc.overdueTasks++;
                }
            }
        }
        return acc;
    }, {
        documentsByWorkflowStatus: {},
        documentsByAssignee: {},
        overdueTasks: 0
    });

    return stats;
}

/**
 * Batch update documents
 * @param updates Map of document IDs to their updates
 * @returns Updated documents
 */
async bulkUpdateDocuments(
    updates: Map<string, Partial<NexusDocument['fields']>>
): Promise<NexusDocument[]> {
    const updatedDocs: NexusDocument[] = [];
    
    for (const [id, fields] of updates) {
        try {
            const updated = await this.updateDocument(id, fields);
            updatedDocs.push(updated);
        } catch (error) {
            console.error(`Failed to update document ${id}:`, error);
        }
    }
    
    return updatedDocs;
}

/**
 * Archive multiple documents
 * @param ids Document IDs to archive
 */
async bulkArchiveDocuments(ids: string[]): Promise<void> {
    const updates = new Map(
        ids.map(id => [id, { status: 'archived' as const }])
    );
    await this.bulkUpdateDocuments(updates);
}

/**
 * Clone a document
 * @param id Source document ID
 * @param options Optional field overrides
 * @returns New document
 */
async cloneDocument(
    id: string, 
    options?: Partial<CreateDocumentOptions>
): Promise<NexusDocument> {
    const sourceDoc = await this.getDocument(id);
    if (!sourceDoc) {
        throw new Error(`Source document ${id} not found`);
    }

    const createOptions: CreateDocumentOptions = {
        title: `Copy of ${sourceDoc.fields.title}`,
        content: sourceDoc.fields.content,
        type: sourceDoc.fields.type,
        tags: [...sourceDoc.fields.tags],
        category: sourceDoc.fields.category,
        author: sourceDoc.fields.author,
        status: 'draft',
        locale: sourceDoc.fields.locale,
        ...options
    };

    const newDoc = await this.createAndAddDocument(createOptions);

    // Create reference relation
    await this.addDocumentRelation({
        sourceId: newDoc.id,
        targetId: id,
        type: 'reference',
        metadata: {
            clonedAt: new Date().toISOString()
        }
    });

    return newDoc;
}

/**
 * Get document history
 * @param id Document ID
 * @returns Document history entries
 */
async getDocumentHistory(id: string): Promise<{
    version: number;
    content: string;
    modified: Date;
    author: string;
    changelog?: string;
}[]> {
    const document = await this.getDocument(id);
    if (!document) {
        throw new Error(`Document ${id} not found`);
    }

    return document.versions || [];
}

/**
 * Restore document to a previous version
 * @param id Document ID
 * @param version Version number to restore
 * @returns Updated document
 */
async restoreVersion(id: string, version: number): Promise<NexusDocument> {
    const document = await this.getDocument(id);
    if (!document) {
        throw new Error(`Document ${id} not found`);
    }

    const targetVersion = await this.getDocumentVersion(id, version);
    if (!targetVersion) {
        throw new Error(`Version ${version} not found for document ${id}`);
    }

    return this.updateDocument(id, {
        content: targetVersion.content,
        modified: new Date().toISOString(),
        version: document.fields.version + 1
    });
}

/**
 * Set document workflow status
 * @param id Document ID
 * @param status Workflow status
 * @param assignee Optional assignee
 * @param dueDate Optional due date
 */

async setWorkflowStatus(

    id: string,

    status: string,

    assignee?: string,

    dueDate?: Date

): Promise<void> {

    const document = await this.getDocument(id);

    if (!document) {

        throw new Error(`Document ${id} not found`);

    }



    document.metadata.workflow = {

        status,

        assignee,

        dueDate: dueDate?.toISOString()

    };



    const indexedDoc = new IndexedDocument(

        document.id,

        {

            ...document.fields,

            version: String(document.fields.version)

        },

        document.metadata

    );



    await this.searchEngine.updateDocument(indexedDoc);
}