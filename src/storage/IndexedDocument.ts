import { IndexedDocument as IIndexedDocument, DocumentMetadata } from "@/types";

export class IndexedDocument implements IIndexedDocument {
    id: string;
    fields: IndexableDocumentFields;
    metadata?: DocumentMetadata;
    versions: any[] = [];
    relations: any[] = [];

    constructor(
        id: string,


        fields: {

            title: string;

            content: string;

            author: string;
        fields: IndexableDocumentFields
    }
    [x: string]: any;
    document(): IIndexedDocument {
        return this;
    }

    static fromObject(obj: Partial<IIndexedDocument> & { id: string; fields: any }): IndexedDocument {
        // Ensure fields have the correct structure
        const fields = {
            title: obj.fields.title || '',
            content: obj.fields.content || '',
            author: obj.fields.author || '',
            tags: Array.isArray(obj.fields.tags) ? obj.fields.tags : [],
            ...obj.fields

        };

        // Create new instance with proper structure
        const doc = new IndexedDocument(
            obj.id,
            fields,
            obj.metadata || {
                indexed: Date.now(),
                lastModified: Date.now()
            }
        );

        // Ensure toObject is properly bound
        doc.toObject = doc.toObject.bind(doc);

        return doc;
    }

    toObject(): IIndexedDocument {
        return {
            id: this.id,
            fields: {
                ...this.fields,
                tags: [...this.fields.tags] // Create new array to avoid references
            },
            metadata: this.metadata ? { ...this.metadata } : undefined,
            versions: [...this.versions],
            relations: [...this.relations],
            document: () => this,
            clone: () => this.clone(),
            update: (updates) => this.update(updates)
        };
    }

    clone(): IndexedDocument {
        return IndexedDocument.fromObject(this.toObject());
    }


    update(updates: Partial<IIndexedDocument>): IndexedDocument {

        const fields = {

            ...this.fields

        };



        if (updates.fields) {

            Object.entries(updates.fields).forEach(([key, value]) => {

                if (value !== undefined) {

                    fields[key] = value;

                }

            });

        }



        return IndexedDocument.fromObject({

            id: this.id,

            fields,

            metadata: {

                ...this.metadata,

                ...updates.metadata,

                lastModified: Date.now()

            }

        });

    }

}
