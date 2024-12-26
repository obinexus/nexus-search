import { 
    IndexedDocument as IIndexedDocument, 
    DocumentMetadata, 
    IndexableDocumentFields 
} from "@/types/document";



export class IndexedDocument implements IIndexedDocument {
    readonly id: string;
    fields: IndexableDocumentFields & {
        title: string;
        content: string;
        author: string;
        tags: string[];
        [key: string]: string | string[] | number | boolean | null;
    };
    metadata?: DocumentMetadata;
    versions: any[] = [];
    relations: any[] = [];
    content: any;

    constructor(
        id: string,
        fields: IndexableDocumentFields & {
            title: string;
            content: string;
            author: string;
            tags: string[];
            [key: string]: string | string[] | number | boolean | null;
        },
        metadata?: DocumentMetadata
    ) {
        this.id = id;
        this.fields = this.normalizeFields(fields);
        this.metadata = this.normalizeMetadata(metadata);
    }

    private normalizeFields(fields: IndexableDocumentFields): IndexableDocumentFields & {
        title: string;
        content: string;
        author: string;
        tags: string[];
        [key: string]: string | string[] | number | boolean | null;
    } {
        return {
            ...fields
        };
    }

    private normalizeMetadata(metadata?: DocumentMetadata): DocumentMetadata {
        return {
            indexed: Date.now(),
            lastModified: Date.now(),
            ...metadata
        };
    }

    toObject(): IIndexedDocument {
        return {
            id: this.id,
            fields: {
                ...this.fields,
                tags: [...this.fields.tags]
            },
            metadata: this.metadata ? { ...this.metadata } : undefined,
            versions: [...this.versions],
            relations: [...this.relations],
            content: this.content,
            document: () => this,
            clone: () => this.clone(),
            update: (updates: Partial<IIndexedDocument>) => this.update(updates)
        };
    }

    clone(): IndexedDocument {
        return new IndexedDocument(
            this.id,
            { ...this.fields, tags: [...this.fields.tags] },
            this.metadata ? { ...this.metadata } : undefined
        );
    }

    update(updates: Partial<IIndexedDocument>): IndexedDocument {
        const updatedFields = {
            ...this.fields
        };

        if (updates.fields) {
            Object.entries(updates.fields).forEach(([key, value]) => {
                if (value !== undefined) {
                    // Type assertion to handle string index signature
                    (updatedFields as any)[key] = value;
                }
            });
        }

        return new IndexedDocument(
            this.id,
            updatedFields,
            {
                ...this.metadata,
                ...updates.metadata,
                lastModified: Date.now()
            }
        );
    }

    getField<T extends keyof IndexableDocumentFields>(
        field: T
    ): IndexableDocumentFields[T] {
        return this.fields[field];
    }

    setField<T extends keyof IndexableDocumentFields>(
        field: T,
        value: IndexableDocumentFields[T]
    ): void {
        (this.fields as any)[field] = value;
    }

    document(): IIndexedDocument {
        return this;
    }

    static create(data: {
        id: string;
        fields: IndexableDocumentFields & {
            title: string;
            content: string;
            author: string;
            tags: string[];
            [key: string]: string | string[] | number | boolean | null;
        };
        metadata?: DocumentMetadata;
    }): IndexedDocument {
        return new IndexedDocument(
            data.id,
            data.fields,
            data.metadata
        );
    }

    static fromObject(obj: Partial<IIndexedDocument> & { 
        id: string; 
        fields: IndexableDocumentFields;
    }): IndexedDocument {
        return IndexedDocument.create({
            id: obj.id,
            fields: {
                ...obj.fields,
                title: obj.fields.title,
                content: obj.fields.content,
                author: obj.fields.author,
                tags: obj.fields.tags
            },
            metadata: obj.metadata
        });
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

    toString(): string {
        return `IndexedDocument(${this.id})`;
    }
}