import { IndexedDocument } from "@/storage";
import { SearchOptions, SearchResult, SearchEngineConfig, SearchEventListener } from "@/types";
export declare class SearchEngine {
    private readonly indexManager;
    private readonly queryProcessor;
    private storage;
    private readonly cache;
    private readonly config;
    private readonly eventListeners;
    private trie;
    private isInitialized;
    private documents;
    private trieRoot;
    constructor(config: SearchEngineConfig);
    initialize(): Promise<void>;
    addDocuments(documents: IndexedDocument[]): Promise<void>;
    search(query: string, options?: SearchOptions): Promise<SearchResult<IndexedDocument>[]>;
    updateDocument(document: IndexedDocument): Promise<void>;
    removeDocument(documentId: string): Promise<void>;
    clearIndex(): Promise<void>;
    private performBasicSearch;
    private processSearchResults;
    private calculateTermScore;
    private normalizeScore;
    private extractMatches;
    private applyPagination;
    private isComplexRegex;
    private loadIndexes;
    private generateCacheKey;
    private generateDocumentId;
    addEventListener(listener: SearchEventListener): void;
    removeEventListener(listener: SearchEventListener): void;
    private emitEvent;
    close(): Promise<void>;
    getIndexedDocumentCount(): number;
    getTrieState(): unknown;
    bulkUpdate(updates: Map<string, Partial<IndexedDocument>>): Promise<void>;
    importIndex(indexData: unknown): Promise<void>;
    exportIndex(): unknown;
    getDocument(id: string): IndexedDocument | undefined;
    getAllDocuments(): IndexedDocument[];
    reindexAll(): Promise<void>;
    optimizeIndex(): Promise<void>;
    getStats(): {
        documentCount: number;
        indexSize: number;
        cacheSize: number;
        initialized: boolean;
    };
    isReady(): boolean;
}
