import { TrieNode } from "./TrieNode";

export class TrieSearch {
  private root: TrieNode;

  constructor() {
    this.root = new TrieNode();
  }

  insert(word: string, documentId: string): void {
    let current = this.root;
    
    for (const char of word.toLowerCase()) {
      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode());
      }
      current = current.children.get(char)!;
    }
    
    current.isEndOfWord = true;
    current.data.add(documentId);
  }

  search(prefix: string, maxResults: number = 10): Set<string> {
    const results = new Set<string>();
    let current = this.root;

    for (const char of prefix.toLowerCase()) {
      if (!current.children.has(char)) {
        return results;
      }
      current = current.children.get(char)!;
    }

    this.collectIds(current, results, maxResults);
    return results;
  }

  private collectIds(node: TrieNode, results: Set<string>, maxResults: number): void {
    if (node.isEndOfWord) {
      for (const id of node.data) {
        if (results.size >= maxResults) return;
        results.add(id);
      }
    }

    for (const child of node.children.values()) {
      if (results.size >= maxResults) return;
      this.collectIds(child, results, maxResults);
    }
  }

  fuzzySearch(word: string, maxDistance: number = 2): Set<string> {
    const results = new Set<string>();
    this.fuzzySearchHelper(word.toLowerCase(), this.root, '', maxDistance, results);
    return results;
  }

  private fuzzySearchHelper(
    word: string,
    node: TrieNode,
    currentWord: string,
    maxDistance: number,
    results: Set<string>
  ): void {
    if (maxDistance < 0) return;

    if (node.isEndOfWord) {
      const distance = this.levenshteinDistance(word, currentWord);
      if (distance <= maxDistance) {
        node.data.forEach(id => results.add(id));
      }
    }

    for (const [char, childNode] of node.children) {
      this.fuzzySearchHelper(
        word,
        childNode,
        currentWord + char,
        maxDistance,
        results
      );
    }
  }

  private levenshteinDistance(s1: string, s2: string): number {
    const dp: number[][] = Array(s1.length + 1)
      .fill(0)
      .map(() => Array(s2.length + 1).fill(0));

    for (let i = 0; i <= s1.length; i++) dp[i][0] = i;
    for (let j = 0; j <= s2.length; j++) dp[0][j] = j;

    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (s1[i - 1] !== s2[j - 1] ? 1 : 0)
        );
      }
    }

    return dp[s1.length][s2.length];
  }
}