import { TrieSearch } from "@/algorithms/trie";
import { 
    IndexedDocument, 
    SearchableDocument, 
    SearchResult, 
    SerializedState,
    DocumentValue 
} from "@/types";
import { DataMapper } from "./DataMapper";

/**
 * IndexMapper class
 * Manages document indexing and search operations using trie data structure
 */
export class IndexMapper {
    private dataMapper: DataMapper;
    private trieSearch: TrieSearch;
    private documents: Map<string, IndexedDocument>;
    private documentScores: Map<string, { score: number; matches: Set<string> }>;

    constructor(state?: { dataMap?: Record<string, string[]> }) {
        this.dataMapper = new DataMapper();
        if (state?.dataMap) {
            this.dataMapper.importState(state.dataMap);
        }
        this.trieSearch = new TrieSearch();
        this.documents = new Map();
        this.documentScores = new Map();
    }

    /**
     * Index a document for search operations
     */
    indexDocument(document: SearchableDocument, id: string, fields: string[]): void {
        try {
            // Store the document
            if (document.content) {
                this.documents.set(id, {
                    id,
                    fields: document.content as Record<string, string>,
                    metadata: document.metadata
                } as IndexedDocument);
            }

            // Index each field
            fields.forEach(field => {
                const value = document.content[field];
                if (value !== undefined && value !== null) {
                    const textValue = this.normalizeValue(value);
                    const words = this.tokenizeText(textValue);
                    
                    words.forEach(word => {
                        if (word) {
                            this.trieSearch.addWord(word, id);
                            this.dataMapper.mapData(word.toLowerCase(), id);
                        }
                    });
                }
            });
        } catch (error) {
            console.error(`Error indexing document ${id}:`, error);
            throw new Error(`Failed to index document: ${error}`);
        }
    }

    /**
     * Search for documents matching the query
     */
    search(query: string, options: { fuzzy?: boolean; maxResults?: number } = {}): SearchResult<string>[] {
        try {
            const { fuzzy = false, maxResults = 10 } = options;
            const searchTerms = this.tokenizeText(query);

            this.documentScores.clear();

            searchTerms.forEach(term => {
                if (!term) return;

                const documentIds = fuzzy
                    ? this.trieSearch.fuzzySearch(term, 2)
                    : this.trieSearch.searchWord(term);

                documentIds.forEach(docId => {
                    const current = this.documentScores.get(docId) || { 
                        score: 0, 
                        matches: new Set<string>() 
                    };
                    current.score += this.calculateScore(docId, term);
                    current.matches.add(term);
                    this.documentScores.set(docId, current);
                });
            });

            const results = Array.from(this.documentScores.entries())
                .map(([docId, { score, matches }]): SearchResult<string> => ({
                    id: docId,
                    document: this.documents.get(docId) as IndexedDocument,
                    item: docId,
                    score: score / searchTerms.length,
                    matches: Array.from(matches),
                    metadata: this.documents.get(docId)?.metadata
                }))
                .sort((a, b) => b.score - a.score)
                .slice(0, maxResults);

            return results;
        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }

    /**
     * Export the current state for persistence
     */
    exportState(): unknown {
        return {
            trie: this.trieSearch.serializeState(),
            dataMap: this.dataMapper.exportState(),
            documents: Array.from(this.documents.entries())
        };
    }

    /**
     * Import a previously exported state
     */
    importState(state: { 
        trie: SerializedState; 
        dataMap: Record<string, string[]>;
        documents?: [string, IndexedDocument][];
    }): void {
        if (!state || !state.trie || !state.dataMap) {
            throw new Error('Invalid index state');
        }

        this.trieSearch = new TrieSearch();
        this.trieSearch.deserializeState(state.trie);
        
        // Create new DataMapper instance instead of reassigning
        const newDataMapper = new DataMapper();
        newDataMapper.importState(state.dataMap);
        this.dataMapper = newDataMapper;

        // Restore documents if available
        if (state.documents) {
            this.documents = new Map(state.documents);
        }
    }

    /**
     * Clear all indexed data
     */
    clear(): void {
        this.trieSearch = new TrieSearch();
        const newDataMapper = new DataMapper();
        this.dataMapper = newDataMapper;
        this.documents.clear();
        this.documentScores.clear();
    }

    // Helper methods remain unchanged
    private normalizeValue(value: DocumentValue): string {
        if (typeof value === 'string') {
            return value;
        }
        if (Array.isArray(value)) {
            return value.map(v => this.normalizeValue(v)).join(' ');
        }
        if (typeof value === 'object' && value !== null) {
            return Object.values(value).map(v => this.normalizeValue(v)).join(' ');
        }
        return String(value);
    }

    private tokenizeText(text: string): string[] {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 0);
    }

    private calculateScore(documentId: string, term: string): number {
        const baseScore = this.dataMapper.getDocuments(term.toLowerCase()).has(documentId) ? 1.0 : 0.5;
        const termFrequency = this.calculateTermFrequency(documentId, term);
        return baseScore * (1 + termFrequency);
    }

    private calculateTermFrequency(documentId: string, term: string): number {
        const doc = this.documents.get(documentId);
        if (!doc) return 0;

        const content = Object.values(doc.fields).join(' ').toLowerCase();
        const regex = new RegExp(term, 'gi');
        const matches = content.match(regex);
        return matches ? matches.length : 0;
    }

    // Additional utility methods
    removeDocument(id: string): void {
        this.trieSearch.removeDocument(id);
        this.dataMapper.removeDocument(id);
        this.documents.delete(id);
        this.documentScores.delete(id);
    }

    addDocument(document: SearchableDocument, id: string, fields: string[]): void {
        this.indexDocument(document, id, fields);
    }

    updateDocument(document: SearchableDocument, id: string, fields: string[]): void {
        this.removeDocument(id);
        this.indexDocument(document, id, fields);
    }

    getDocumentById(id: string): IndexedDocument | undefined {
        return this.documents.get(id);
    }

    getAllDocuments(): Map<string, IndexedDocument> {
        return new Map(this.documents);
    }
}