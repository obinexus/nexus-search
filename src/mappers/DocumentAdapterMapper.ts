import { DocumentVersion, DocumentRelation, NexusDocument } from "@/plugins/NexusDocument";
import { IndexedDocument } from "@/storage";
import { DocumentMetadata, DocumentData, IndexableDocumentFields } from "@/types";

/**
 * Document adapter to handle type conversions between NexusDocument and IndexedDocument
 */
export class DocumentAdapter implements IndexedDocument {
    id: string;
    fields: IndexableDocumentFields;
    metadata: DocumentMetadata;
    versions: DocumentVersion[];
    relations: DocumentRelation[];
    content: DocumentData;

    constructor(doc: Partial<NexusDocument>) {
        this.id = doc.id || '';
        this.fields = {
            title: doc.fields?.title ?? '',
            content: doc.fields?.content ?? '',
            author: doc.fields?.author ?? '',
            tags: doc.fields?.tags ?? [],
            version: String(doc.fields?.version ?? '1'),
            modified: doc.fields?.modified ?? new Date().toISOString(),
            type: doc.fields?.type ?? '',
            category: doc.fields?.category ?? '',
            status: doc.fields?.status ?? 'draft',
            locale: doc.fields?.locale ?? '',
            created: doc.fields?.created ?? new Date().toISOString()
        };
        this.metadata = {
            indexed: doc.metadata?.indexed || Date.now(),
            lastModified: doc.metadata?.lastModified || Date.now(),
            ...doc.metadata
        };
        this.versions = doc.versions || [];
        this.relations = doc.relations || [];
        this.content = this.normalizeContent();
    }

    private normalizeContent(): DocumentData {
        return {
            ...this.fields,
            metadata: this.metadata
        };
    }

    normalizeFields(): void {
        this.fields = {
            ...this.fields,
            modified: new Date().toISOString(),
            version: String(this.fields.version)
        };
    }

    normalizeMetadata(metadata?: DocumentMetadata): DocumentMetadata {
        this.metadata = {
            ...this.metadata,
            ...metadata,
            lastModified: Date.now()
        };
        return this.metadata;
    }

    getField<T extends keyof IndexableDocumentFields>(field: T): IndexableDocumentFields[T] {
        return this.fields[field];
    }

    setField<T extends keyof IndexableDocumentFields>(field: T, value: IndexableDocumentFields[T]): void {
        this.fields[field] = value as any;
        this.normalizeFields();
        this.content = this.normalizeContent();
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

    document(): IndexedDocument {
        return this;
    }

    clone(): IndexedDocument {
        return new DocumentAdapter({
            id: this.id,
            fields: {
                ...this.fields,
                tags: [...this.fields.tags]
            },
            metadata: {
                ...this.metadata
            },
            versions: [...this.versions],
            relations: [...this.relations]
        });
    }

    update(updates: Partial<IndexedDocument>): IndexedDocument {
        const updatedDoc = new DocumentAdapter({
            id: this.id,
            fields: {
                ...this.fields,
                ...updates.fields,
                modified: new Date().toISOString()
            },
            metadata: {
                ...this.metadata,
                ...updates.metadata,
                lastModified: Date.now()
            },
            versions: updates.versions || this.versions,
            relations: updates.relations || this.relations
        });

        // Handle versioning if content changes
        if (updates.fields?.content && updates.fields.content !== this.fields.content) {
            updatedDoc.versions = [
                ...this.versions,
                {
                    version: Number(this.fields.version),
                    content: this.fields.content,
                    modified: new Date(this.fields.modified),
                    author: this.fields.author
                }
            ];
        }

        return updatedDoc;
    }

    toObject(): IndexedDocument {
        return {
            id: this.id,
            fields: { ...this.fields },
            metadata: { ...this.metadata },
            versions: [...this.versions],
            relations: [...this.relations],
            content: { ...this.content },
            document: () => this.document(),
            clone: () => this.clone(),
            update: (updates) => this.update(updates),
            toObject: () => this.toObject(),
            normalizeMetadata: async () => this.normalizeMetadata(),
            getField: (key) => this.getField(key),
            setField: (key, value) => this.setField(key, value)
        };
    }

    toNexusDocument(): NexusDocument {
        const indexedDoc = this.toObject();
        return {
            ...indexedDoc,
            clone: () => this.clone().toObject() as unknown as NexusDocument,
            update: (fields) => this.update({ fields: fields as Partial<IndexableDocumentFields> }).toObject() as unknown as NexusDocument,
            toObject: () => this.toObject() as unknown as NexusDocument,
            document: () => this.document() as unknown as NexusDocument
        };
    }

    static fromNexusDocument(doc: NexusDocument): DocumentAdapter {
        return new DocumentAdapter(doc);
    }
}