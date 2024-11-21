
  export class DataMapper {
    private dataMap: Map<string, Set<string>>;
  
    constructor() {
      this.dataMap = new Map();
    }
  
    mapData(key: string, documentId: string): void {
      if (!this.dataMap.has(key)) {
        this.dataMap.set(key, new Set());
      }
      this.dataMap.get(key)!.add(documentId);
    }
  
    getDocuments(key: string): Set<string> {
      return this.dataMap.get(key) || new Set();
    }
  
    getAllKeys(): string[] {
      return Array.from(this.dataMap.keys());
    }
  
    clear(): void {
      this.dataMap.clear();
    }
  }
  
