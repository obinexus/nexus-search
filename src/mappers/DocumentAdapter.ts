import { DocumentVersion, DocumentRelation, NexusDocument, CreateDocumentOptions } from "@/plugins/NexusDocument";
import { IndexedDocument } from "@/storage";
import { DocumentMetadata } from "@/types";

/**
 * Document adapter to handle type conversions between NexusDocument and IndexedDocument
 */
export class DocumentAdapter implements IndexedDocument {
    id: string;
    fields: {
        [key: string]: string | string[];
        title: string;
        content: string;
        type: string;
        tags: string[];
        category: string;
        author: string;
        created: string;
        modified: string;
        status: 'draft' | 'published' | 'archived';
        version: string;
        locale: string;
    };
    metadata: DocumentMetadata;
    versions?: DocumentVersion[];
    relations?: DocumentRelation[];

    constructor(doc: Partial<NexusDocument>) {
        this.id = doc.id || '';
        this.fields = {
            title: doc.fields?.title || '',
            content: doc.fields?.content || '',
            type: doc.fields?.type || '',
            tags: doc.fields?.tags || [],
            category: doc.fields?.category || '',
            author: doc.fields?.author || '',
            created: doc.fields?.created || new Date().toISOString(),
            modified: doc.fields?.modified || new Date().toISOString(),
            status: doc.fields?.status || 'draft',
            version: String(doc.fields?.version || 1),
            locale: doc.fields?.locale || ''
        };
        this.metadata = {
            ...doc.metadata,
            indexed: doc.metadata?.indexed || Date.now(),
            lastModified: doc.metadata?.lastModified || Date.now()
        };
        this.versions = doc.versions;
        this.relations = doc.relations;
    }
    [x: string]: any;

    getDynamicField(key: string): any {
        return this.fields[key];
    }

    setDynamicField(key: string, value: any): void {
        this.fields[key] = value;
    }

    document(): import("@/storage").IndexedDocument {
        throw new Error("Method not implemented.");
    }

  
    clone(): IndexedDocument {

        return new DocumentAdapter({

            ...this,

            fields: {

                ...this.fields,

                version: parseInt(this.fields.version, 10)

            },

            metadata: {

                ...this.metadata,

                indexed: this.metadata.indexed,

                lastModified: this.metadata.lastModified

            }

        });

    }

    update(fields: Partial<typeof this.fields>): IndexedDocument {
        return new DocumentAdapter({
            ...this,
            fields: {
                ...this.fields,
                ...fields,
                modified: new Date().toISOString()
            },
            metadata: {
                ...this.metadata,
                lastModified: Date.now()
            }
        });
    }

    toObject(): IndexedDocument {
        return {
            ...this,
            clone: this.clone.bind(this),
            update: this.update.bind(this),
            toObject: this.toObject.bind(this)
        };
    }

    toNexusDocument(): NexusDocument {
        return {
            id: this.id,
            fields: {
                title: this.fields.title,
                content: this.fields.content,
                type: this.fields.type,
                tags: this.fields.tags,
                category: this.fields.category,
                author: this.fields.author,
                created: this.fields.created,
                modified: this.fields.modified,
                status: this.fields.status as 'draft' | 'published' | 'archived',
                version: parseInt(this.fields.version, 10),
                locale: this.fields.locale
            },
            metadata: this.metadata,
            versions: this.versions,
            relations: this.relations,
            clone: () => this.clone() as NexusDocument,
            update: (fields) => this.update(fields) as NexusDocument,
            toObject: () => this.toObject() as NexusDocument
        };
    }

    static fromNexusDocument(doc: NexusDocument): DocumentAdapter {
        return new DocumentAdapter(doc);
    }
}

// Update the necessary methods in NexusDocumentPlugin to use the adapter
export class NexusDocumentPlugin {
    searchEngine: any;
    // ... other code remains the same ...

    private createDocument(options: CreateDocumentOptions): IndexedDocument {
        this.validateDocument(options);
        const now = new Date();
        
        return new DocumentAdapter({
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
                locale: options.locale || ''
            },
            metadata: {
                ...options.metadata,
                indexed: now.getTime(),
                lastModified: now.getTime(),
                checksum: this.generateChecksum(options.content)
            }
        });
    }
    validateDocument(options: CreateDocumentOptions) {
        throw new Error("Method not implemented.");
    }
    generateChecksum(content: string): string | undefined {
        throw new Error("Method not implemented.");
    }

    async createAndAddDocument(options: CreateDocumentOptions): Promise<NexusDocument> {
        const document = this.createDocument(options);
        await this.searchEngine.addDocuments([document]);
        return (document as DocumentAdapter).toNexusDocument();
    }

   
    async updateDocument(id: string, updates: Partial<NexusDocument['fields']>): Promise<NexusDocument> {

        const document = await this.getDocument(id);

        if (!document) {

            throw new Error(`Document with id ${id} not found`);

        }



        const adapter = DocumentAdapter.fromNexusDocument(document);

        const processedUpdates = {

            ...updates,

            version: updates.version ? String(updates.version) : undefined

        };

        const updated = adapter.update(processedUpdates);

        await this.searchEngine.updateDocument(updated);

        

        return (updated as DocumentAdapter).toNexusDocument();

    }

    getDocument(id: string) {
        throw new Error("Method not implemented.");
    }

    async exportDocuments(): Promise<NexusDocument[]> {
        const docs = await this.searchEngine.getAllDocuments();
        return docs.map(doc => new DocumentAdapter(doc).toNexusDocument());
    }

    async importDocuments(documents: NexusDocument[]): Promise<void> {
        const indexedDocs = documents.map(doc => 
            DocumentAdapter.fromNexusDocument(doc).toObject()
        );
        await this.searchEngine.addDocuments(indexedDocs);
    }

    // Update other methods that work with documents similarly...
}