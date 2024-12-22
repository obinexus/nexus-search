import { SearchEngine } from "@/core";
import { SearchOptions, IndexedDocument } from "@/types";
import { isSearchOptions } from "..";

interface NexusSearchPluginOptions extends SearchOptions {
    documents: IndexedDocument[];
}

export class NexusSearchPlugin {
    private searchEngine: SearchEngine;
    private options: NexusSearchPluginOptions;

    constructor(options: NexusSearchPluginOptions) {
        this.options = options;
        this.searchEngine = new SearchEngine({
            name: "nexus-search-plugin",
            version: 1,
            fields: ["title", "content", "author", "tags"]
        });
    }

    get description(): string {
        return "Nexus Search Plugin for indexing and searching documents.";
    }

    get filename(): string {
        return "NexusSearchPlugin.ts";
    }

    get length(): number {
        return this.options.documents.length;
    }

    get name(): string {
        return "NexusSearchPlugin";
    }

    async initialize(): Promise<void> {
        const indexedDocuments = this.options.documents.map(doc => ({
            ...doc,
            id: doc.id || this.generateDocumentId(),
            fields: {
                title: doc.fields.title,
                content: doc.fields.content,
                author: doc.fields.author,
                tags: doc.fields.tags
            }
        }));
        await this.searchEngine.addDocuments(indexedDocuments);
    }

    private generateDocumentId(): string {
        return Math.random().toString(36).substring(2, 11);
    }

    async search(query: string, options?: SearchOptions): Promise<IndexedDocument[]> {
        const results = await this.searchEngine.search(query, options);
    
        if (options && isSearchOptions(options) && options.regex instanceof RegExp) {
            return results
                .filter(result => typeof result.item.fields.content === "string" && options.regex instanceof RegExp && options.regex.test(result.item.fields.content))
                .map(result => result.item);
        }
    
        return results.map(result => result.item);
    }
    
    async searchByTag(tag: string): Promise<IndexedDocument[]> {
        const results = await this.searchEngine.search(tag);
        return results.map(result => result.item);
    }

    
    async addDocument(document: IndexedDocument) {
        const indexedDocument = {
            ...document,
            id: document.id || this.generateDocumentId(),
            fields: {
                title: document.fields.title,
                content: document.fields.content,
                author: document.fields.author,
                tags: Array.isArray(document.fields.tags) ? document.fields.tags : [document.fields.tags]
            }
        };
        await this.searchEngine.addDocuments([indexedDocument]);
    }

    async removeDocument(documentId: string) {
        await this.searchEngine.removeDocument(documentId);
    }

    async updateDocument(document: IndexedDocument) {
        const indexedDocument = {
            ...document,
            id: document.id || this.generateDocumentId(),
            fields: {
                title: document.fields.title,
                content: document.fields.content,
                author: document.fields.author,
                tags: Array.isArray(document.fields.tags) ? document.fields.tags : [document.fields.tags]
            }
        };
        await this.searchEngine.updateDocument(indexedDocument);
    }

    // Extend plugin system with support for additional features

    async loadMarkdown(markdownContent: string) {
        const documents = this.parseMarkdown(markdownContent);
        const indexedDocuments = documents.map(doc => ({
            ...doc,
            id: doc.id || this.generateDocumentId(),
            fields: {
                title: doc.fields.title,
                content: doc.fields.content,
                author: doc.fields.author,
                tags: Array.isArray(doc.fields.tags) ? doc.fields.tags : [doc.fields.tags]
            }
        }));
        await this.searchEngine.addDocuments(indexedDocuments);
    }

    async loadHTML(htmlContent: string) {
        const documents = this.parseHTML(htmlContent);
        const indexedDocuments = documents.map(doc => ({
            ...doc,
            id: doc.id || this.generateDocumentId(),
            fields: {
                title: doc.fields.title,
                content: doc.fields.content,
                author: doc.fields.author,
                tags: Array.isArray(doc.fields.tags) ? doc.fields.tags : [doc.fields.tags]
            }
        }));
        await this.searchEngine.addDocuments(indexedDocuments);
    }

    async searchWithRegex(query: string, regex: RegExp): Promise<IndexedDocument[]> {
        const allResults = await this.searchEngine.search(query);
        return allResults
            .filter(result => typeof result.item.fields.content === "string" && regex.test(result.item.fields.content))
            .map(result => result.item);
    }

    parseMarkdown(markdownContent: string): IndexedDocument[] {
        return [
            {
                id: this.generateDocumentId(),
                fields: {
                    title: "Markdown Title",
                    content: markdownContent,
                    author: "Unknown",
                    tags: ["markdown"]
                },
                toObject: function (): IndexedDocument {
                    return this;
                }
            }
        ];
    }

    parseHTML(htmlContent: string): IndexedDocument[] {
        return [
            {
                id: this.generateDocumentId(),
                fields: {
                    title: "HTML Title",
                    content: htmlContent,
                    author: "",
                    tags: []
                },
                toObject: function (): IndexedDocument {
                    return this;
                }

            }
        ];

    }
}
