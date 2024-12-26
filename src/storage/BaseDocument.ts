import { DocumentMetadata, IndexedDocument, IndexableDocumentFields, DocumentData } from "@/types";

export class BaseDocument implements IndexedDocument {
    id: string;
    document(): IndexedDocument {
        return this;
    }
    fields: IndexableDocumentFields & { content: string };
    metadata?: DocumentMetadata;
    versions: any[];
    relations: any[];

    constructor(doc: Partial<BaseDocument>) {
        this.id = doc.id || '';
        this.fields = {
            title: doc.fields?.title || '',
            content: doc.fields?.content || '',
            author: doc.fields?.author || '',
            version: doc.fields?.version || '1',
            tags: doc.fields?.tags || [],
            ...doc.fields
        };
        this.versions = doc.versions || [];
        this.relations = doc.relations || [];
        this.metadata = {
            indexed: Date.now(),
            lastModified: Date.now(),
            ...(doc.metadata || {})
        };

        this.versions = doc.versions || [];
        this.relations = doc.relations || [];
        this.metadata = {
            indexed: Date.now(),
            lastModified: Date.now(),
            ...(doc.metadata || {})
        };
    }
    content: DocumentData;

    clone(): IndexedDocument {
        return new BaseDocument({
            ...this,
            fields: { ...this.fields },
            versions: [...(this.versions || [])],
            relations: [...(this.relations || [])],
            metadata: { ...this.metadata }
        });
    }

    toObject(): IndexedDocument {
        interface DocumentObject extends IndexedDocument {
            toObject: () => DocumentObject;
            clone: () => IndexedDocument;
            update: (updates: Partial<IndexedDocument>) => IndexedDocument;
        }

                const obj: DocumentObject = {
                    id: this.id,
                    fields: this.fields,
                    metadata: this.metadata,
                    versions: this.versions,
                    relations: this.relations,
                    document: function (): IndexedDocument { return obj; },
                    toObject: function (): DocumentObject { return obj; },
                    clone: (): IndexedDocument => this.clone(),
                    update: (updates: Partial<IndexedDocument>): IndexedDocument => this.update(updates),
                    content: this.content
                };
                return obj;
    }

    update(updates: Partial<IndexedDocument>): IndexedDocument {
        const now = new Date();
        const currentVersion = this.fields.version;
        const fields: Partial<IndexableDocumentFields> = updates.fields || {};

        if (fields.content && fields.content !== this.fields.content) {
            this.versions = this.versions || [];
            this.versions.push({
                version: Number(currentVersion),
                content: this.fields.content,
                modified: this.fields.modified && typeof this.fields.modified === 'string' ? new Date(this.fields.modified) : new Date(),
                author: this.fields.author
            });
        }

        return new BaseDocument({
            ...this,
            fields: {
                ...this.fields,
                ...fields,
                version: fields.content ? (Number(currentVersion) + 1).toString() : currentVersion
            },
            metadata: {
                ...this.metadata,
                lastModified: now.toISOString()
            }
        });
    }
}