import { DocumentVersion, DocumentRelation } from "@/plugins/NexusDocument";
import { DocumentMetadata } from "@/types";
import { IndexedDocument } from "./IndexedDocument";

/**
 * BaseDocument class that properly implements IndexedDocument
 */
export class BaseDocument implements IndexedDocument {
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
        status: string;
        version: string;
        locale: string;
    };
    versions?: DocumentVersion[];
    relations?: DocumentRelation[];
    metadata: DocumentMetadata & {
        indexed: number;
        lastModified: number;
        checksum?: string;
        permissions?: string[];
        workflow?: {
            status: string;
            assignee?: string;
            dueDate?: string;
        };
    };

    constructor(doc: Partial<BaseDocument>) {
        this.id = doc.id || '';
        this.fields = doc.fields || {
            title: '',
            content: '',
            type: '',
            tags: [],
            category: '',
            author: '',
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            status: '',
            version: '1',
            locale: ''
        };
        this.versions = doc.versions || [];
        this.relations = doc.relations || [];
        this.metadata = {
            indexed: Date.now(),
            lastModified: Date.now(),
            ...(doc.metadata || {})
        };
    }

    clone(): IndexedDocument {
        return new BaseDocument({
            ...this,
            fields: { ...this.fields },
            versions: [...(this.versions || [])],
            relations: [...(this.relations || [])],
            metadata: { ...this.metadata }
        });
    }

    update(fields: Partial<BaseDocument['fields']>): IndexedDocument {
        const now = new Date();
        const currentVersion = this.fields.version;

        if (fields.content && fields.content !== this.fields.content) {
            this.versions = this.versions || [];
            this.versions.push({
                version: Number(currentVersion),
                content: this.fields.content,
                modified: new Date(this.fields.modified),
                author: this.fields.author
            });
        }

        return new BaseDocument({
            ...this,
            fields: {
                ...this.fields,
                ...fields,
                modified: now.toISOString(),
                version: fields.content ? currentVersion + 1 : currentVersion
            },
            metadata: {
                ...this.metadata,
                lastModified: now.getTime()
            }
        });
    }

    toObject(): IndexedDocument {
        return {
            ...this,
            clone: this.clone.bind(this),
            update: this.update.bind(this),
            toObject: this.toObject.bind(this)
        };
    }
    document(): IndexedDocument {
        return this;
    }
    }


