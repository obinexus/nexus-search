import { IndexMapper } from "@/mappers";
import { IndexConfig, SearchOptions, SearchResult, IndexedDocument, SearchableDocument } from "@/types";
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
        documents.forEach((doc, index) => {
            const id = this.generateDocumentId(index);
            const searchableDoc: SearchableDocument = {
                id,
                content: createSearchableFields({
                    content: doc.fields,
                    id: ""
                }, this.config.fields),
                metadata: doc.metadata
            };
            this.documents.set(id, { ...doc, id }); 
            this.indexMapper.indexDocument(searchableDoc, id, this.config.fields);
        });
    }

    async search<T extends IndexedDocument>(query: string, options: SearchOptions): Promise<SearchResult<T>[]> {
        const searchResults = this.indexMapper.search(query, {
            fuzzy: options.fuzzy,
            maxResults: options.maxResults
        });

        return searchResults.map(result => ({
            item: this.documents.get(result.item) as T,
            score: result.score,
            matches: result.matches
        }));
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

    importIndex(data: MapperState ): void {
        if (!this.isValidIndexData(data)) {
            throw new Error('Invalid index data format');
        }
        try {
            this.documents = new Map(
                data.documents.map(item => [item.key, item.value])
            );
            this.config = data.config;
            this.indexMapper = new IndexMapper();
            this.indexMapper.importState(data.indexState);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to import index: ${message}`);
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

    private serializeDocument(doc: IndexedDocument): IndexedDocument {
        return JSON.parse(JSON.stringify(doc));
    }
}