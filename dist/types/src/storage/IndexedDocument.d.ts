import { IndexedDocument as IIndexedDocument, DocumentMetadata } from "@/types";
export declare class IndexedDocument implements IIndexedDocument {
    id: string;
    fields: {
        title: string;
        content: string;
        author: string;
        tags: string[];
    };
    metadata?: DocumentMetadata;
    constructor(id: string, fields: {
        title: string;
        content: string;
        author: string;
        tags: string[];
    }, metadata?: DocumentMetadata);
    static fromObject(obj: IIndexedDocument): IndexedDocument;
    toObject(): IIndexedDocument;
}
