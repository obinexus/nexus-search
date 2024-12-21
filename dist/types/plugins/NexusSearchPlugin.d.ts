import { SearchOptions, IndexedDocument } from "@/types";
interface NexusSearchPluginOptions extends SearchOptions {
    documents: IndexedDocument[];
}
export declare class NexusSearchPlugin {
    private searchEngine;
    private options;
    constructor(options: NexusSearchPluginOptions);
    get description(): string;
    get filename(): string;
    get length(): number;
    get name(): string;
    initialize(): Promise<void>;
    private generateDocumentId;
    search(query: string, options?: SearchOptions): Promise<IndexedDocument[]>;
    searchByTag(tag: string): Promise<IndexedDocument[]>;
    addDocument(document: IndexedDocument): Promise<void>;
    removeDocument(documentId: string): Promise<void>;
    updateDocument(document: IndexedDocument): Promise<void>;
    loadMarkdown(markdownContent: string): Promise<void>;
    loadHTML(htmlContent: string): Promise<void>;
    searchWithRegex(query: string, regex: RegExp): Promise<IndexedDocument[]>;
    parseMarkdown(markdownContent: string): IndexedDocument[];
    parseHTML(htmlContent: string): IndexedDocument[];
}
export {};
