export class TrieNode {
    children: Map<string, TrieNode>;
    isEndOfWord: boolean;
    data: Set<string>;
    
    constructor() {
      this.children = new Map();
      this.isEndOfWord = false;
      this.data = new Set();
    }
  }
  