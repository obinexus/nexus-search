import { SearchOptions } from "@/types";
interface NexusDocument {
    id: string;
    title: string;
    content: string;
    path: string;
    type: string;
}
export declare class NexusDocumentAdapter {
    private documents;
    private searchEngine;
    constructor();
    addDocument(document: NexusDocument): Promise<void>;
    removeDocumentById(id: string): Promise<void>;
    search(query: string, options?: Partial<SearchOptions>): Promise<NexusDocument[]>;
    getDocuments(): NexusDocument[];
}
export declare class NexusDocumentPlugin {
    private adapter;
    constructor(adapter: NexusDocumentAdapter);
    indexDocuments(): Promise<number>;
    bfsSearch(startDocId: string, query: string): Promise<NexusDocument | null>;
    dfsSearch(startDocId: string, query: string): Promise<NexusDocument | null>;
}
export {};
