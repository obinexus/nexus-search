import { TrieSearch } from "@/algorithms/trie";
import {  IndexedDocument, SearchableDocument, SearchResult, SerializedState } from "@/types";
import { DataMapper } from "./DataMapper";


/**
 * IndexMapper class
 * @description IndexMapper class that indexes documents and performs search operations
 * @class IndexMapper
 * @implements {IndexMapper}
 * @method indexDocument
 * @method search
 * 
 */
export class IndexMapper {
  private dataMapper: DataMapper;
  private trieSearch: TrieSearch;

  constructor() {
    this.dataMapper = new DataMapper();
    this.trieSearch = new TrieSearch();
  }

  indexDocument(document: SearchableDocument, id: string, fields: string[]): void {
    fields.forEach(field => {
        const value = document[field];
        if (typeof value === 'string') {
            const words = this.tokenizeText(value);
            words.forEach(word => {
                this.trieSearch.insert(word, id);
                this.dataMapper.mapData(word.toLowerCase(), id);
            });
        }
    });
}

  search(query: string, options: { fuzzy?: boolean; maxResults?: number } = {}): SearchResult<string>[] {
    const { fuzzy = false, maxResults = 10 } = options;
    const searchTerms = this.tokenizeText(query);
    
    const documentScores = new Map<string, { score: number; matches: Set<string> }>();

    searchTerms.forEach(term => {
      const documentIds = fuzzy
        ? this.trieSearch.fuzzySearch(term)
        : this.trieSearch.search(term, maxResults);

      documentIds.forEach(id => {
        const current = documentScores.get(id) || { score: 0, matches: new Set<string>() };
        current.score += this.calculateScore(id, term);
        current.matches.add(term);
        documentScores.set(id, current);
      });
    });

    const results = Array.from(documentScores.entries())
      .map(([id, { score, matches }]) => ({
        id: id,
        document: this.dataMapper.getDocumentById(id) as unknown as IndexedDocument,
        item: id,
        score: score / searchTerms.length,
        matches: Array.from(matches)
      }))
      .sort((a, b) => b.score - a.score);

    return results.slice(0, maxResults);
  }

  exportState(): unknown {
    return {
      trie: this.trieSearch.exportState(),
      dataMap: this.dataMapper.exportState()
    };
  }

  importState(state: { trie: SerializedState; dataMap: Record<string, string[]> }): void {
    if (!state || !state.trie || !state.dataMap) {
        throw new Error('Invalid index state');
    }

    this.trieSearch = new TrieSearch();
    this.trieSearch.importState(state.trie );
    this.dataMapper = new DataMapper();
    this.dataMapper.importState(state.dataMap);
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
    return baseScore
  
  }
  removeDocument(id: string): void {
    this.trieSearch.remove(id);
    this.dataMapper.removeDocument(id);
  }


  
  addDocument(id: string, fields: string[], document: SearchableDocument): void {
    this.indexDocument(document, id, fields);
  }

  updateDocument(document: SearchableDocument, id: string, fields: string[]): void {
    this.removeDocument(id);
    this.indexDocument(document, id, fields);
  }

  clear(): void {
    this.trieSearch = new TrieSearch();
    this.dataMapper = new DataMapper();
  }
}
