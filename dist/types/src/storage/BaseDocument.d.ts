import { DocumentMetadata, IndexedDocument, DocumentVersion, DocumentRelation, IndexableFields, DocumentValue } from "@/types";
export declare class BaseDocument implements IndexedDocument {
    readonly id: string;
    fields: IndexableFields;
    metadata?: DocumentMetadata;
    versions: DocumentVersion[];
    relations: DocumentRelation[];
    content?: Record<string, DocumentValue>;
    links?: string[];
    ranks?: number[];
    constructor(doc: Partial<BaseDocument>);
    private generateId;
    private normalizeFields;
    private normalizeMetadata;
    private normalizeContent;
    private normalizeContentObject;
    private normalizeValue;
    private normalizeRelations;
    private normalizeRelationType;
    document(): IndexedDocument;
    clone(): IndexedDocument;
    toObject(): IndexedDocument;
    update(updates: Partial<IndexedDocument>): IndexedDocument;
    private isContentEqual;
}
