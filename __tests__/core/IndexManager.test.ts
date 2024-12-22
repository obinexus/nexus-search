
describe('IndexManager', () => {
  let indexManager: IndexManager;
  const testConfig: IndexConfig = {
    name: 'test-index',
    version: 1,
    fields: ['title', 'content'],
  };

  beforeEach(() => {
    indexManager = new IndexManager(testConfig);
  });

  test('should add documents to index', async () => {
    const docs = [
      { title: 'Test', content: 'Content' },
    ];

    await expect(indexManager.addDocuments(docs)).resolves.not.toThrow();
  });

  test('should export and import index', async () => {
    const docs = [
      { title: 'Test', content: 'Content' },
    ];

    await indexManager.addDocuments(docs);
    const exported = indexManager.exportIndex();
    
    const newIndexManager = new IndexManager(testConfig);
    expect(() => newIndexManager.importIndex(exported)).not.toThrow();
  });
});

import { IndexManager } from '@/index';
import { IndexConfig } from '@/types';
// src/tests/unit/algorithms/TrieSearch.test.ts
import { TrieSearch } from '../../../src/algorithms/trie/TrieSearch';

describe('TrieSearch', () => {
  let trie: TrieSearch;

  beforeEach(() => {
    trie = new TrieSearch();
  });

  test('should insert and find exact matches', () => {
    trie.insert('hello', 'doc1');
    trie.insert('help', 'doc2');

    const results = trie.search('hello');
    expect(results.has('doc1')).toBeTruthy();
    expect(results.has('doc2')).toBeFalsy();
  });

  test('should perform fuzzy search', () => {
    trie.insert('hello', 'doc1');
    
    const results = trie.fuzzySearch('helo', 1);
    expect(results.has('doc1')).toBeTruthy();
  });
});

