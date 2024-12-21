import { IndexMapper } from "@/mappers";
import { 
    IndexConfig, 
    SearchOptions, 
    SearchResult, 
    IndexedDocument, 
    SearchableDocument, 
    SerializedState,
    DocumentValue 
} from "@/types";
import { SerializedIndex } from "@/types/core";
import { createSearchableFields } from "@/utils";

export class IndexManager {
    private indexMapper: IndexMapper;
    private config: IndexConfig;
    private documents: Map<string, IndexedDocument>;

    constructor(config: IndexConfig) {
        this.config = config;
        this.indexMapper = new IndexMapper();
        this.documents = new Map();
    }

    async addDocuments<T extends IndexedDocument>(documents: T[]): Promise<void> {
        for (const [index, doc] of documents.entries()) {
            const id = this.generateDocumentId(index);

            // Convert document fields to Record<string, DocumentValue>
            const contentRecord: Record<string, DocumentValue> = {};
            for (const field of this.config.fields) {
                if (field in doc) {
                    if (field in doc) {
                        contentRecord[field] = (doc as any)[field] as DocumentValue;
                    }
                }
            }

            // Create searchable document with proper field extraction
            const searchableDoc: SearchableDocument = {
                id,
                content: createSearchableFields({
                    content: contentRecord,
                    id
                }, this.config.fields),
                metadata: doc.metadata
            };

            // Store original document with ID
            this.documents.set(id, { ...doc, id });

            // Index the document
            try {
                await this.indexMapper.indexDocument(searchableDoc, id, this.config.fields);
            } catch (error) {
                console.warn(`Failed to index document ${id}:`, error);
            }
        }
    }

    async search<T extends IndexedDocument>(
        query: string, 
        options: SearchOptions = {}
    ): Promise<SearchResult<T>[]> {
        if (!query.trim()) return [];

        try {
            const searchResults = await this.indexMapper.search(query, {
                fuzzy: options.fuzzy ?? false,
                maxResults: options.maxResults ?? 10
            });

            return searchResults
                .filter(result => this.documents.has(result.item))
                .map(result => ({
                    item: this.documents.get(result.item) as T,
                    score: result.score,
                    matches: result.matches
                }))
                .filter(result => result.score >= (options.threshold ?? 0.5));

        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }

    exportIndex(): SerializedIndex {
        return {
            documents: Array.from(this.documents.entries()).map(([key, value]) => ({
                key,
                value: this.serializeDocument(value)
            })),
            indexState: this.indexMapper.exportState(),
            config: this.config
        };
    }

    importIndex(data: unknown): void {
        if (!this.isValidIndexData(data)) {
            throw new Error('Invalid index data format');
        }

        try {
            const typedData = data as SerializedIndex;
            this.documents = new Map(
                typedData.documents.map(item => [item.key, item.value])
            );
            this.config = typedData.config;
            this.indexMapper = new IndexMapper();
            
            if (this.isValidIndexState(typedData.indexState)) {
                this.indexMapper.importState({
                    trie: typedData.indexState.trie,
                    dataMap: typedData.indexState.dataMap
                });
            } else {
                throw new Error('Invalid index state format');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to import index: ${message}`);
        }
    }

    async removeDocument(documentId: string): Promise<void> {
        if (this.documents.has(documentId)) {
            this.documents.delete(documentId);
            await this.indexMapper.removeDocument(documentId);
        }
    }

    async updateDocument<T extends IndexedDocument>(document: T): Promise<void> {
        const id = document.id;
        if (this.documents.has(id)) {
            this.documents.set(id, document);
            const contentRecord: Record<string, DocumentValue> = {};
            for (const field of this.config.fields) {
                if (field in document) {
                    if (field in document) {
                        contentRecord[field] = (document as any)[field] as DocumentValue;
                    }
                }
            }
            const searchableDoc: SearchableDocument = {
                id,
                content: createSearchableFields({
                    content: contentRecord,
                    id
                }, this.config.fields),
                metadata: document.metadata
            };
            await this.indexMapper.updateDocument(searchableDoc, id, this.config.fields);
        }
    }

    clear(): void {
        this.documents.clear();
        this.indexMapper = new IndexMapper();
    }

    private generateDocumentId(index: number): string {
        return `${this.config.name}-${index}-${Date.now()}`;
    }

    private isValidIndexData(data: unknown): data is SerializedIndex {
        if (!data || typeof data !== 'object') return false;
        
        const indexData = data as Partial<SerializedIndex>;
        return Boolean(
            indexData.documents &&
            Array.isArray(indexData.documents) &&
            indexData.indexState !== undefined &&
            indexData.config &&
            typeof indexData.config === 'object'
        );
    }

    private isValidIndexState(state: unknown): state is { trie: SerializedState; dataMap: Record<string, string[]> } {
        return (
            state !== null &&
            typeof state === 'object' &&
            'trie' in state &&
            'dataMap' in state
        );
    }

    private serializeDocument(doc: IndexedDocument): IndexedDocument {
        return JSON.parse(JSON.stringify(doc));
    }
}