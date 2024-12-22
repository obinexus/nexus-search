import { IndexedDocument as IIndexedDocument, DocumentMetadata } from "@/types";

export class IndexedDocument implements IIndexedDocument {
    id: string;
    fields: {
        title: string;
        content: string;
        author: string;
        tags: string[];
    };
    metadata?: DocumentMetadata;

    constructor(id: string, fields: { title: string; content: string; author: string; tags: string[] }, metadata?: DocumentMetadata) {
        this.id = id;
        this.fields = fields;
        this.metadata = metadata;
    }

    static fromObject(obj: IIndexedDocument): IndexedDocument {
        return new IndexedDocument(obj.id, obj.fields, obj.metadata);
    }

    toObject(): IIndexedDocument {
        return {
            id: this.id,
            fields: this.fields,
            metadata: this.metadata
        };
    }
}