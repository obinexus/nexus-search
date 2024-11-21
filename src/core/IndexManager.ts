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
      return {
        documents: Array.from(this.documents.entries()),
        config: this.config
      };
    }
  
    importIndex(data: any): void {
      this.documents = new Map(data.documents);
      this.config = data.config;
    }
  
    clear(): void {
      this.documents.clear();
      this.indexMapper = new IndexMapper();
    }
  
    private generateDocumentId(index: number): string {
      return `${this.config.name}-${index}-${Date.now()}`;
    }
  }
  