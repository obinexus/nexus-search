import { IndexedDocument as IIndexedDocument, DocumentMetadata, IndexableDocumentFields } from "@/types/document";
export declare class IndexedDocument implements IIndexedDocument {
    readonly id: string;
    fields: IndexableDocumentFields & {
        title: string;
        content: string;
        author: string;
        tags: string[];
        [key: string]: string | string[] | number | boolean | null;
    };
    metadata?: DocumentMetadata;
    versions: any[];
    relations: any[];
    content: any;
    constructor(id: string, fields: IndexableDocumentFields & {
        title: string;
        content: string;
        author: string;
        tags: string[];
        [key: string]: string | string[] | number | boolean | null;
    }, metadata?: DocumentMetadata);
    private normalizeFields;
    private normalizeMetadata;
    toObject(): any;
    clone(): IndexedDocument;
    update(updates: Partial<IIndexedDocument>): IndexedDocument;
    getField<T extends keyof IndexableDocumentFields>(field: T): IndexableDocumentFields[T];
    setField<T extends keyof IndexableDocumentFields>(field: T, value: IndexableDocumentFields[T]): void;
    document(): IIndexedDocument;
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
    }): IndexedDocument;
    static fromObject(obj: Partial<IIndexedDocument> & {
        id: string;
        fields: IndexableDocumentFields;
    }): IndexedDocument;
    toJSON(): Record<string, any>;
    toString(): string;
}
