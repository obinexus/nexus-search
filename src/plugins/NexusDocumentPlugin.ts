import { SearchEngine } from "@/core";
import { 
    SearchOptions, 
    IndexedDocument, 
    DocumentMetadata, 
    SearchResult 
} from "@/types";

// Plugin configuration interface
interface NexusDocumentPluginConfig {
    name?: string;
    version?: number;
    fields?: string[];
    storage?: {
        type: 'memory' | 'indexeddb';
        options?: Record<string, any>;
    };
}

// Document interface extending IndexedDocument
export interface NexusDocument extends IndexedDocument {
    fields: {
        title: string;
        content: string;
        type: string;
        tags: string[];
        category?: string;
        author?: string;
        created: Date;
        modified: Date;
    };
}

// Document creation options
interface CreateDocumentOptions {
    title: string;
    content: string;
    type: string;
    tags?: string[];
    category?: string;
    author?: string;
    metadata?: DocumentMetadata;
}

export class NexusDocumentPlugin {
    private searchEngine: SearchEngine;
    private readonly defaultConfig: Required<NexusDocumentPluginConfig> = {
        name: 'nexus-document-plugin',
        version: 1,
        fields: ['title', 'content', 'type', 'tags', 'category', 'author', 'created', 'modified'],
        storage: {
            type: 'memory'
        }
    };

    constructor(config: NexusDocumentPluginConfig = {}) {
        const mergedConfig = { ...this.defaultConfig, ...config };
        
        this.searchEngine = new SearchEngine({
            name: mergedConfig.name,
            version: mergedConfig.version,
            fields: mergedConfig.fields,
            storage: mergedConfig.storage
        });
    }

    async initialize(): Promise<void> {
        await this.searchEngine.initialize();
    }

    private createDocument(options: CreateDocumentOptions): NexusDocument {
        const now = new Date();
        
        return {
            id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fields: {
                title: options.title,
                content: options.content,
                type: options.type,
                tags: options.tags || [],
                category: options.category,
                author: options.author,
                created: now,
                modified: now
            },
            metadata: {
                ...options.metadata,
                indexed: now.getTime(),
                lastModified: now.getTime()
            },
            clone(): IndexedDocument {
                return {
                    ...this,
                    fields: { ...this.fields },
                    metadata: { ...this.metadata }
                };
            },
            update(fields: Partial<NexusDocument['fields']>): IndexedDocument {
                const now = new Date();
                return {
                    ...this,
                    fields: {
                        ...this.fields,
                        ...fields,
                        modified: now
                    },
                    metadata: {
                        ...this.metadata,
                        lastModified: now.getTime()
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

    async search(query: string, options?: SearchOptions): Promise<SearchResult<NexusDocument>[]> {
        return this.searchEngine.search<NexusDocument>(query, options);
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

    async updateDocument(id: string, updates: Partial<NexusDocument['fields']>): Promise<NexusDocument> {
        const document = await this.getDocument(id);
        if (!document) {
            throw new Error(`Document with id ${id} not found`);
        }

        const updatedDocument = document.update(updates) as NexusDocument;
        await this.searchEngine.updateDocument(updatedDocument);
        return updatedDocument;
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

    // Advanced features

    async exportDocuments(): Promise<NexusDocument[]> {
        return this.searchEngine.getAllDocuments() as unknown as NexusDocument[];
    }

    async importDocuments(documents: NexusDocument[]): Promise<void> {
        await this.searchEngine.addDocuments(documents);
    }

    async getStats(): Promise<{
        totalDocuments: number;
        documentsByType: Record<string, number>;
        documentsByCategory: Record<string, number>;
    }> {
        const documents = await this.exportDocuments();
        const documentsByType = documents.reduce((acc, doc) => {
            acc[doc.fields.type] = (acc[doc.fields.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const documentsByCategory = documents.reduce((acc, doc) => {
            if (doc.fields.category) {
                acc[doc.fields.category] = (acc[doc.fields.category] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        return {
            totalDocuments: documents.length,
            documentsByType,
            documentsByCategory
        };
    }
}

// Example usage:
/*
const plugin = new NexusDocumentPlugin({
    name: 'my-documents',
    storage: { type: 'indexeddb' }
});

await plugin.initialize();

// Create a document
const document = await plugin.createAndAddDocument({
    title: 'Getting Started',
    content: 'This is a guide to get started with our platform.',
    type: 'guide',
    tags: ['beginner', 'tutorial'],
    category: 'documentation'
});

// Search documents
const results = await plugin.search('platform');
const guideResults = await plugin.searchByType('guide');
const docResults = await plugin.searchByCategory('documentation');
const tagResults = await plugin.searchByTags(['tutorial']);

// Update a document
await plugin.updateDocument(document.id, {
    content: 'Updated content...'
});

// Delete a document
await plugin.deleteDocument(document.id);
*/