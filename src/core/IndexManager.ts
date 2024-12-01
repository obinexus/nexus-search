import { IndexMapper } from "@/mappers/IndexMapper";
import { IndexConfig, SearchOptions, SearchResult } from "@/types";
import { createSearchableFields } from "@/utils/SearchUtils";

export class IndexManager {
    private indexMapper: IndexMapper;
    private config: IndexConfig;
    private documents: Map<string, any>;
  
    constructor(config: IndexConfig) {
      this.config = config;
      this.indexMapper = new IndexMapper();
      this.documents = new Map();
    }
  
    async addDocuments<T>(documents: T[]): Promise<void> {
      documents.forEach((doc, index) => {
        const id = this.generateDocumentId(index);
        this.documents.set(id, doc);
        
        const searchableFields = createSearchableFields(doc, this.config.fields);
        this.indexMapper.indexDocument(searchableFields, id, this.config.fields);
      });
    }
  
    async search<T>(query: string, options: SearchOptions): Promise<SearchResult<T>[]> {
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
  
    exportIndex(): any {
      // Convert Map to a serializable format and include indexMapper state
      return {
        documents: Array.from(this.documents.entries()).map(([key, value]) => ({
          key,
          value: JSON.parse(JSON.stringify(value)) // Handle potential proxy objects
        })),
        indexState: this.indexMapper.exportState(),
        config: JSON.parse(JSON.stringify(this.config)) // Ensure config is serializable
      };
    }
  
    importIndex(data: any): void {
      if (!data || !data.documents || !data.indexState || !data.config) {
        throw new Error('Invalid index data format');
      }

      try {
        // Restore documents
        this.documents = new Map(
          data.documents.map((item: any) => [item.key, item.value])
        );

        // Restore config
        this.config = data.config;

        // Restore index mapper state
        this.indexMapper = new IndexMapper();
        this.indexMapper.importState(data.indexState);
      } catch (error) {
        throw new Error(`Failed to import index: ${error}`);
      }
    }
  
    clear(): void {
      this.documents.clear();
      this.indexMapper = new IndexMapper();
    }
  
    private generateDocumentId(index: number): string {
      return `${this.config.name}-${index}-${Date.now()}`;
    }
}