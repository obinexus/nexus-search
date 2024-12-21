import { DocumentLink, SerializedState } from "@/types";
export declare class TrieSearch {
    private root;
    private documents;
    private documentLinks;
    constructor();
    insert(text: string, documentId: string): void;
    search(query: string, maxResults?: number): Set<string>;
    remove(documentId: string): void;
    private removeHelper;
    linkDocument(documentId: string, links: DocumentLink[]): void;
    getDocumentLinks(documentId: string): DocumentLink[];
    removeData(documentId: string): void;
    fuzzySearch(query: string, maxDistance?: number): Set<string>;
    private collectDocumentRefs;
    private fuzzySearchHelper;
    private calculateLevenshteinDistance;
    exportState(): SerializedState;
    importState(state: SerializedState): void;
    private serializeNode;
    private deserializeNode;
    clear(): void;
    getSize(): number;
}
