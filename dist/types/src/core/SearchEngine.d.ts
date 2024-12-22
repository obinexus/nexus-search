/**
 * SearchEngine.ts - Reference Implementation
 *
 * This file contains the complete unoptimized version of the SearchEngine class
 * with all features intact. This version includes:
 * - Full event handling
 * - Debug methods
 * - Storage fallback
 * - Cache management
 * - Document indexing
 * - Search functionality
 */
import { SearchOptions, SearchResult, IndexedDocument, SearchEngineConfig, SearchEventListener } from "@/types";
/**
 * SearchEngine class provides full-text search functionality with:
 * - Document indexing and storage
 * - Search with fuzzy matching
 * - Event handling
 * - Cache management
 * - Debug capabilities
 */
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
    constructor(config: SearchEngineConfig);
    /**
     * Initializes the search engine and storage
     */
    initialize(): Promise<void>;
    /**
     * Adds documents to the search index
     */
    addDocuments<T extends IndexedDocument>(documents: T[]): Promise<void>;
    /**
     * Searches the index for documents matching the query
     */
    search<T extends IndexedDocument>(query: string, options?: SearchOptions): Promise<SearchResult<T>[]>;
    removeDocument(documentId: string): Promise<void>;
    updateDocument<T extends IndexedDocument>(document: T): Promise<void>;
    addEventListener(listener: SearchEventListener): void;
    removeEventListener(listener: SearchEventListener): void;
    private emitEvent;
    private loadIndexes;
    private generateCacheKey;
    private generateDocumentId;
    clearIndex(): Promise<void>;
    close(): Promise<void>;
    get isReady(): boolean;
    getAllDocuments(): IndexedDocument[];
    getIndexedDocumentCount(): number;
    getTrieState(): unknown;
}
