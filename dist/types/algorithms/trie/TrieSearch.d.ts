import { SerializedState } from "@/types";
export declare class TrieSearch {
    private root;
    private documents;
    private documentLinks;
    constructor();
    insert(text: string, documentId: string): void;
    search(query: string, maxResults?: number): Set<string>;
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
