import { DocumentVersion, DocumentRelation, NexusDocument } from "@/plugins/NexusDocument";
import { IndexedDocument } from "@/storage";
import { DocumentMetadata } from "@/types";

/**
 * Document adapter to handle type conversions between NexusDocument and IndexedDocument
 */
export class DocumentAdapter implements IndexedDocument {
    id: string;
    fields: {
        [key: string]: string | string[];
        title: string;
        content: string;
        type: string;
        tags: string[];
        category: string;
        author: string;
        created: string;
        modified: string;
        status: 'draft' | 'published' | 'archived';
        version: string;
        locale: string;
    };
    metadata: DocumentMetadata;
    versions: DocumentVersion[];
    relations: DocumentRelation[];

    constructor(doc: Partial<NexusDocument>) {
        this.id = doc.id || '';
        this.fields = {
            title: doc.fields?.title || '',
            content: doc.fields?.content || '',
            type: doc.fields?.type || '',
            tags: doc.fields?.tags || [],
            category: doc.fields?.category || '',
            author: doc.fields?.author || '',
            created: doc.fields?.created || new Date().toISOString(),
            modified: doc.fields?.modified || new Date().toISOString(),
            status: doc.fields?.status || 'draft',
            version: String(doc.fields?.version || 1),
            locale: doc.fields?.locale || ''
        };
        this.metadata = {
            ...doc.metadata,
            indexed: doc.metadata?.indexed || Date.now(),
            lastModified: doc.metadata?.lastModified || Date.now()
        };
        this.versions = doc.versions || [];
        this.relations = doc.relations || [];
    }
    [x: string]: any;

    getDynamicField(key: string): any {
        return this.fields[key];
    }

    setDynamicField(key: string, value: any): void {
        this.fields[key] = value;
    }

    document(): import("@/storage").IndexedDocument {
        throw new Error("Method not implemented.");
    }

  
    clone(): IndexedDocument {
        return new DocumentAdapter({
            id: this.id,
            fields: {
                title: this.fields.title,
                content: this.fields.content,
                type: this.fields.type || '',
                tags: [...this.fields.tags],
                category: this.fields.category || '',
                author: this.fields.author || '',
                created: this.fields.created || new Date().toISOString(),
                modified: this.fields.modified || new Date().toISOString(),
                status: this.fields.status || 'draft',
                version: String(Number(this.fields.version)) || '1',
                locale: this.fields.locale || ''
            },
            metadata: {
                ...this.metadata,
                indexed: Number(this.metadata.indexed) || Date.now(),
                lastModified: Number(this.metadata.lastModified) || Date.now()
            },
            versions: [...(this.versions || [])],
            relations: [...(this.relations || [])]
        });
    }

    update(updates: Partial<IndexedDocument>): IndexedDocument {
        return new DocumentAdapter({
            id: this.id,
            fields: {
                title: updates.fields?.title || this.fields.title,
                content: updates.fields?.content || this.fields.content,
                type: (typeof updates.fields?.type === 'string' ? updates.fields.type : undefined) || this.fields.type,
                tags: updates.fields?.tags || this.fields.tags,
                category: typeof updates.fields?.category === 'string' ? updates.fields.category : this.fields.category,
                author: updates.fields?.author || this.fields.author,
                created: typeof updates.fields?.created === 'string' ? updates.fields.created : this.fields.created,
                modified: new Date().toISOString(),
                status: (updates.fields?.status || this.fields.status) as 'draft' | 'published' | 'archived',
                version: updates.fields?.version || this.fields.version,
                locale: (typeof updates.fields?.locale === 'string' ? updates.fields.locale : undefined) || this.fields.locale
            },
            metadata: {
                ...this.metadata,
                ...updates.metadata,
                indexed: Number(this.metadata.indexed) || Date.now(),
                lastModified: Date.now()
            },
            versions: this.versions,
            relations: this.relations
        });
    }

    toObject(): IndexedDocument {
        return this;
    }

    toNexusDocument(): NexusDocument {
        return {
            id: this.id,
            fields: {
            title: this.fields.title,
            content: this.fields.content,
            type: this.fields.type,
            tags: this.fields.tags,
            category: this.fields.category,
            author: this.fields.author,
            created: this.fields.created,
            modified: this.fields.modified,
            status: this.fields.status as 'draft' | 'published' | 'archived',
            version: String(this.fields.version),
            locale: this.fields.locale
            },
            metadata: {
            ...this.metadata,
            indexed: Number(this.metadata.indexed) || Date.now(),
            lastModified: Number(this.metadata.lastModified) || Date.now()
            },
            versions: this.versions,
            relations: this.relations,
            clone: () => this.clone().toNexusDocument(),
            update: (fields) => this.update({ ...fields, version: fields.version ? String(Number(fields.version)) : undefined }) as unknown as NexusDocument,
            toObject: () => this.toObject() as unknown as NexusDocument,
            document: () => this.document()
        };
    }

    static fromNexusDocument(doc: NexusDocument): DocumentAdapter {
        return new DocumentAdapter(doc);
    }
}