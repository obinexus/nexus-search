import { SearchResult } from '../types';
import { DataMapper } from './DataMapper';
import { TrieSearch } from '../algorithms/trie/TrieSearch';

export class IndexMapper {
  private dataMapper: DataMapper;
  private trieSearch: TrieSearch;

  constructor() {
    this.dataMapper = new DataMapper();
    this.trieSearch = new TrieSearch();
  }

  indexDocument(document: any, id: string, fields: string[]): void {
    fields.forEach(field => {
      const value = document[field];
      if (typeof value === 'string') {
        const words = value.split(/\s+/);
        words.forEach(word => {
          this.trieSearch.insert(word, id);
          this.dataMapper.mapData(word.toLowerCase(), id);
        });
      }
    });
  }

  search(query: string, options: { fuzzy?: boolean; maxResults?: number } = {}): SearchResult<string>[] {
    const { fuzzy = false, maxResults = 10 } = options;
    
    const documentIds = fuzzy
      ? this.trieSearch.fuzzySearch(query)
      : this.trieSearch.search(query, maxResults);

    const results: SearchResult<string>[] = Array.from(documentIds).map(id => ({
      item: id as string,
      score: this.calculateScore(id, query),
      matches: [query]
    }));

    return results.slice(0, maxResults);
  }

  private calculateScore(documentId: string, query: string): number {
    // Basic scoring implementation - can be enhanced
    const exactMatch = this.dataMapper.getDocuments(query.toLowerCase()).has(documentId);
    return exactMatch ? 1.0 : 0.5;
  }
}
