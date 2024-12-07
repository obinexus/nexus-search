export class TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  documentRefs: Set<string>;
  weight: number;

  constructor() {
      this.children = new Map();
      this.isEndOfWord = false;
      this.documentRefs = new Set();
      this.weight = 0.0;
  }
}