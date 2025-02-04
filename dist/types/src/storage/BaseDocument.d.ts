import { DocumentMetadata, IndexedDocument, DocumentVersion, DocumentRelation, IndexableFields, DocumentValue, DocumentLink, DocumentRank, DocumentBase } from "@/types";
export declare class BaseDocument implements IndexedDocument {
    readonly id: string;
    fields: IndexableFields;
    metadata?: DocumentMetadata;
    versions: DocumentVersion[];
    relations: DocumentRelation[];
    content?: Record<string, DocumentValue>;
    links?: DocumentLink[];
    ranks?: DocumentRank[];
    title: string;
    author: string;
    tags: string[];
    version: string;
    constructor(doc: Partial<BaseDocument>);
    base(): DocumentBase;
    private generateId;
    private normalizeFields;
    private normalizeMetadata;
    private normalizeContent;
    private normalizeContentObject;
    private normalizePrimitiveArray;
    private normalizePrimitive;
    private normalizeRelations;
    private normalizeLinks;
    private normalizeRanks;
    private normalizeRelationType;
    document(): IndexedDocument;
    clone(): IndexedDocument;
    toObject(): IndexedDocument;
    update(updates: Partial<IndexedDocument>): IndexedDocument;
    private isContentEqual;
}
