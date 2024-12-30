import { 
    DocumentMetadata, 
    IndexedDocument,
    DocumentContent,
    DocumentVersion,
    DocumentRelation,
    RelationType,
    IndexableFields,
    PrimitiveValue,
    DocumentValue
} from "@/types";

export class BaseDocument implements IndexedDocument {
    readonly id: string;
    fields: IndexableFields;
    metadata?: DocumentMetadata;
    versions: DocumentVersion[];
    relations: DocumentRelation[];
    content?: Record<string, DocumentValue>;
    links?: string[];
    ranks?: number[];

    constructor(doc: Partial<BaseDocument>) {
        this.id = doc.id || this.generateId();
        this.fields = this.normalizeFields(doc.fields);
        this.metadata = this.normalizeMetadata(doc.metadata);
        this.versions = doc.versions || [];
        this.relations = this.normalizeRelations(doc.relations || []);
        this.content = doc.content;
        this.links = doc.links || [];
        this.ranks = doc.ranks || [];
    }

    private generateId(): string {
        return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }

    private normalizeFields(fields?: Partial<IndexableFields>): IndexableFields {
        return {
            title: fields?.title || '',
            content: this.normalizeContent(fields?.content),
            author: fields?.author || '',
            tags: Array.isArray(fields?.tags) ? [...fields.tags] : [],
            version: fields?.version || '1.0',
            modified: fields?.modified || new Date().toISOString(),
            ...fields
        };
    }

    private normalizeMetadata(metadata?: Partial<DocumentMetadata>): DocumentMetadata {
        const now = Date.now();
        return {
            indexed: metadata?.indexed ?? now,
            lastModified: metadata?.lastModified ?? now,
            ...metadata
        };
    }

    private normalizeContent(content: any): DocumentContent {
        if (!content) {
            return { text: '' };
        }

        if (typeof content === 'string') {
            return { text: content };
        }

        if (typeof content === 'object' && content !== null) {
            return this.normalizeContentObject(content);
        }

        return { text: String(content) };
    }

    private normalizeContentObject(obj: Record<string, any>): DocumentContent {
        const result: DocumentContent = {};
        
        for (const [key, value] of Object.entries(obj)) {
            if (value === null || value === undefined) {
                result[key] = null;
                continue;
            }

            if (typeof value === 'object') {
                if (Array.isArray(value)) {
                    result[key] = value.map(v => this.normalizeValue(v));
                } else {
                    result[key] = this.normalizeContentObject(value);
                }
            } else {
                result[key] = this.normalizeValue(value);
            }
        }

        return result;
    }

    private normalizeValue(value: any): DocumentValue {
        if (value === null || value === undefined) {
            return null;
        }

        if (Array.isArray(value)) {
            return value.map(v => this.normalizeValue(v)) as DocumentValue[];
        }

        if (typeof value === 'object') {
            return this.normalizeContentObject(value);
        }

        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return value as PrimitiveValue;
        }

        return String(value);
    }

    private normalizeRelations(relations: Array<Partial<DocumentRelation>>): DocumentRelation[] {
        return relations.map(relation => ({
            sourceId: this.id,
            targetId: relation.targetId || '',
            type: this.normalizeRelationType(relation.type || 'reference'),
            metadata: relation.metadata
        }));
    }

    private normalizeRelationType(type: string): RelationType {
        const normalizedType = type.toLowerCase();
        switch (normalizedType) {
            case 'parent':
                return 'parent' as RelationType;
            case 'child':
                return 'child' as RelationType;
            case 'related':
                return 'related' as RelationType;
            case 'reference':
            default:
                return 'reference' as RelationType;
        }
    }

    document(): IndexedDocument {
        return this;
    }

    clone(): IndexedDocument {
        return new BaseDocument({
            id: this.id,
            fields: { ...this.fields },
            versions: [...this.versions],
            relations: [...this.relations],
            metadata: { ...this.metadata },
            content: this.content ? { ...this.content } : undefined,
            links: this.links ? [...this.links] : undefined,
            ranks: this.ranks ? [...this.ranks] : undefined
        });
    }

    toObject(): IndexedDocument {
        return {
            id: this.id,
            fields: this.fields,
            metadata: this.metadata,
            versions: this.versions,
            relations: this.relations,
            links: this.links,
            ranks: this.ranks,
            document: () => this.document(),
        };
    }

    update(updates: Partial<IndexedDocument>): IndexedDocument {
        const now = Date.now();
        const currentVersion = this.fields.version;
        const updatedFields: Partial<IndexableFields> = updates.fields || {};

        // Handle versioning
        if (updatedFields.content && !this.isContentEqual(updatedFields.content, this.fields.content)) {
            this.versions.push({
                version: Number(currentVersion),
                content: this.fields.content,
                modified: new Date(this.metadata?.lastModified || now),
                author: this.fields.author
            });
        }

        // Create updated document
        return new BaseDocument({
            id: this.id,
            fields: {
                ...this.fields,
                ...updatedFields,
                version: updatedFields.content ? 
                    (Number(currentVersion) + 1).toString() : 
                    currentVersion,
                modified: new Date().toISOString()
            },
            versions: this.versions,
            relations: updates.relations || this.relations,
            metadata: {
                ...this.metadata,
                lastModified: now
            },
            content: updates.fields?.content || this.content,
            links: updates.links || this.links,
            ranks: updates.ranks || this.ranks
        });
    }

    private isContentEqual(content1: DocumentContent, content2: DocumentContent): boolean {
        return JSON.stringify(content1) === JSON.stringify(content2);
    }
}
