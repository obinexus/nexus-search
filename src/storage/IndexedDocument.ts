
import { IndexedDocument as IIndexedDocument, DocumentData, IndexableDocumentFields } from "@/types/document";



export class IndexedDocument implements IIndexedDocument {

    id: string;

    fields: {
        title: string;
        content: string;
        author: string;
        tags: string[];
    };

    metadata?: DocumentMetadata;

    versions: any[] = [];

    relations: any[] = [];



    constructor(id: string, fields: IndexableDocumentFields, metadata?: DocumentMetadata) {

        this.id = id;

        this.fields = fields;

        this.metadata = metadata;

    }



    [x: string]: any;
        return {
            id: this.id,
            fields: this.fields,
            metadata: this.metadata,
            versions: this.versions,
            relations: this.relations,
            document: () => this.document(),
            clone: () => this.clone(),
            update: (updates: Partial<IIndexedDocument>) => this.update(updates)
        };


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

                tags: Array.isArray(this.fields.tags) ? [...this.fields.tags] : [] // Create new array to avoid references



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

            update: (updates: Partial<IIndexedDocument>) => this.update(updates)

        };

    }



    clone(): IndexedDocument {

        return IndexedDocument.fromObject(this.toObject());

    }



    update(updates: Partial<IIndexedDocument>): IndexedDocument {

        const fields: IndexableDocumentFields = {

            title: this.fields.title || '',

            content: this.fields.content || '',

            author: this.fields.author || '',

            tags: Array.isArray(this.fields.tags) ? this.fields.tags : [],

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

}
