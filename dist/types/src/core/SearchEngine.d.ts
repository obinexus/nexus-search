import { IndexedDocument } from "@/storage";
import { SearchResult, SearchEngineConfig, SearchEventListener, ExtendedSearchOptions } from "@/types";
export declare class SearchEngine {
    private readonly queryProcessor;
    private storage;
    private readonly cache;
    private readonly config;
    private readonly eventListeners;
    private trie;
    private isInitialized;
    private documents;
    private trieRoot;
    private readonly documentSupport;
    private readonly indexManager;
    constructor(config: SearchEngineConfig);
    private extractRegexMatches;
    initialize(): Promise<void>;
    /**
     * Add a single document to the search engine
     */
    addDocument(document: IndexedDocument): Promise<void>;
    /**
     * Add documents to the search engine
     */
    addDocuments(documents: IndexedDocument[]): Promise<void>;
    /**
     * Helper method to normalize document content
     */
    private normalizeContent;
    /**
     * Helper method to normalize date strings
     */
    private normalizeDate;
    /**
     * Helper method to normalize document status
     */
    private normalizeStatus;
    updateDocument(document: IndexedDocument): Promise<void>;
    search(query: string, options?: ExtendedSearchOptions): Promise<SearchResult<IndexedDocument>[]>;
    /**
     * Performs regex-based search using either BFS or DFS traversal
     */
    private performRegexSearch;
    private performBasicSearch;
    /**
 * Creates a RegExp object from various input types
 */
    private createRegexFromOption;
    /**
     * Determines if a regex pattern is complex
     */
    private isComplexRegex;
    private processSearchResults;
    getTrieState(): unknown;
    private validateDocuments;
    removeDocument(documentId: string): Promise<void>;
    clearIndex(): Promise<void>;
    private calculateTermScore;
    private normalizeScore;
    private extractMatches;
    private applyPagination;
    private loadIndexes;
    private generateCacheKey;
    addEventListener(listener: SearchEventListener): void;
    removeEventListener(listener: SearchEventListener): void;
    /**
      * Emit search engine events
      */
    private emitEvent;
    close(): Promise<void>;
    getIndexedDocumentCount(): number;
    bulkUpdate(updates: Map<string, Partial<IndexedDocument>>): Promise<void>;
    importIndex(indexData: unknown): Promise<void>;
    exportIndex(): unknown;
    getDocument(id: string): IndexedDocument | undefined;
    getAllDocuments(): IndexedDocument[];
    reindexAll(): Promise<void>;
    optimizeIndex(): Promise<void>;
    handleVersioning(doc: IndexedDocument): Promise<void>;
    private normalizeDocument;
    restoreVersion(id: string, version: number): Promise<void>;
    getDocumentVersion(id: string, version: number): Promise<any | undefined>;
    getStats(): {
        documentCount: number;
        indexSize: number;
        cacheSize: number;
        initialized: boolean;
    };
    isReady(): boolean;
}
