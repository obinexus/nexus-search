import { TrieSearch } from "../../algorithms/trie/TrieSearch";

describe('TrieSearch', () => {
  let trieSearch: TrieSearch;

  beforeEach(() => {
    trieSearch = new TrieSearch();
  });

  test('should insert and find exact matches', () => {
    trieSearch.insert('hello', 'doc1');
    const results = trieSearch.search('hello');
    expect(results.has('doc1')).toBeTruthy();
  });

  test('should handle fuzzy search', () => {
    trieSearch.insert('hello', 'doc1');
    const results = trieSearch.fuzzySearch('helo', 1);
    expect(results.has('doc1')).toBeTruthy();
  });
});

