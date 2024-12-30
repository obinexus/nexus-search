import { DocumentMetadata, IndexedDocument, IndexableDocumentFields, DocumentData, DocumentContent } from "@/types";

export class BaseDocument implements IndexedDocument {
    id: string;
    fields: IndexableDocumentFields & { content: string };
    metadata?: DocumentMetadata;
    versions: Array<{
        version: number;
        content: DocumentContent;
        modified: Date;
        author: string;
    }>;
    relations: Array<{
        sourceId: string;
        type: string;
        targetId: string;
    }>;
    content: DocumentData;

    constructor(doc: Partial<BaseDocument>) {
        this.id = doc.id || '';
        this.fields = {
            title: doc.fields?.title || '',
            content: doc.fields?.content || { text: '' } as DocumentContent, // Assuming DocumentContent has a 'text' property
            author: doc.fields?.author || '',
            version: doc.fields?.version || '1',
            tags: doc.fields?.tags || [],
            ...doc.fields
        };
        this.relations = doc.relations?.map(relation => ({
            ...relation,
            sourceId: this.id
        })) || [];
        this.relations = doc.relations || [];
        this.metadata = {
            indexed: Date.now(),
            lastModified: Date.now(),
            ...(doc.metadata || {})
        };
        this.content = {
            ...this.fields,
            content: doc.content?.content || { text: '' } as DocumentContent, // Assuming DocumentContent has a 'text' property
            links: doc.content?.links || [],
            ranks: doc.content?.ranks || []
        };
    }

    document(): IndexedDocument {
        return this;
    }

    clone(): IndexedDocument {
        return new BaseDocument({
            ...this,
            fields: { ...this.fields },
            versions: [...this.versions],
            relations: [...this.relations],
            metadata: { ...this.metadata }
        });
    }

    toObject(): IndexedDocument {
        const obj: IndexedDocument = {
            id: this.id,
            fields: this.fields,
            metadata: this.metadata,
            versions: this.versions,
            relations: this.relations,
            content: this.content,
            document: () => this,
        };
        return obj;
    }

    update(updates: Partial<IndexedDocument>): IndexedDocument {
        const now = Date.now();
        const currentVersion = this.fields.version;
        const fields = updates.fields as Partial<IndexableDocumentFields> || {};

        // Create new version if content changes
        if (fields.content && fields.content !== this.fields.content) {
            this.versions.push({
                version: Number(currentVersion),
                content: this.fields.content as DocumentContent,
                modified: new Date(this.metadata?.lastModified || now),
                author: this.fields.author
            });
        }

        // Create updated document
        return new BaseDocument({
            ...this,
            fields: {
                ...this.fields,
                ...fields,
                version: fields.content ? 
                    (Number(currentVersion) + 1).toString() : 
                    currentVersion
            },
            metadata: {
                ...this.metadata,
                lastModified: now
            }
        });
    }
}