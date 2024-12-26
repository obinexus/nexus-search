import { DocumentMetadata, IndexedDocument, IndexableDocumentFields, DocumentData } from "@/types";
export declare class BaseDocument implements IndexedDocument {
    id: string;
    fields: IndexableDocumentFields & {
        content: string;
    };
    metadata?: DocumentMetadata;
    versions: Array<{
        version: number;
        content: string;
        modified: Date;
        author: string;
    }>;
    relations: Array<{
        type: string;
        targetId: string;
    }>;
    content: DocumentData;
    constructor(doc: Partial<BaseDocument>);
    document(): IndexedDocument;
    clone(): IndexedDocument;
    toObject(): IndexedDocument;
    update(updates: Partial<IndexedDocument>): IndexedDocument;
}
