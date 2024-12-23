interface Fields {
    title: string;
    content: string;
    author: string;
    tags: string[];
    version: string;
    [key: string]: string | string[];
}

class BaseDocument {
    fields: Fields;
    versions: any[];
    relations: any[];
    metadata: any;

    constructor(doc: Partial<BaseDocument>) {
        this.fields = {
            title: '',
            content: '',
            author: '',
            version: '1',
            tags: [],
            ...doc.fields
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

    update(updates: Partial<IndexedDocument>): IndexedDocument {
        const now = new Date();
        const currentVersion = this.fields.version;
        const fields = updates.fields || {};

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
                version: fields.content ? (Number(currentVersion) + 1).toString() : currentVersion
            },
            metadata: {
                ...this.metadata,
                lastModified: now.toISOString()
            }
        });
    }
}