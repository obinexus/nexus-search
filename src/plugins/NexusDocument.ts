import { SearchOptions, SearchResult } from "@/types";

// NexusDocumentPlugin: Interface to define plugin structure
interface NexusDocumentPlugin {
    loadDocument(content: string, type: string): Promise<NexusDocument>;
    saveDocument(document: NexusDocument): Promise<void>;
    search(query: string, options?: SearchOptions): SearchResult[];
    transformDocument(document: NexusDocument): NexusDocument;
  }
  
  // NexusDocumentAdapter: Handles document-specific transformations and utilities
  export class NexusDocumentAdapter {
    private readonly plugins: Record<string, NexusDocumentPlugin> = {};
  
    registerPlugin(type: string, plugin: NexusDocumentPlugin): void {
      this.plugins[type] = plugin;
    }
  
    async load(content: string, type: string): Promise<NexusDocument> {
      if (!this.plugins[type]) {
        throw new Error(`No plugin registered for type: ${type}`);
      }
      return await this.plugins[type].loadDocument(content, type);
    }
  
    async save(document: NexusDocument): Promise<void> {
      const type = document.type;
      if (!this.plugins[type]) {
        throw new Error(`No plugin registered for type: ${type}`);
      }
      await this.plugins[type].saveDocument(document);
    }
  
    search(document: NexusDocument, query: string, options?: SearchOptions): SearchResult[] {
      const type = document.type;
      if (!this.plugins[type]) {
        throw new Error(`No plugin registered for type: ${type}`);
      }
      return this.plugins[type].search(query, options);
    }
  
    transform(document: NexusDocument): NexusDocument {
      const type = document.type;
      if (!this.plugins[type]) {
        throw new Error(`No plugin registered for type: ${type}`);
      }
      return this.plugins[type].transformDocument(document);
    }
  }
  
  // Full NexusDocument class implementation
  class NexusDocument {
    id: string;
    title: string;
    content: string;
    type: string;
    indexed: boolean;
  
    constructor(id: string, title: string, content: string, type: string) {
      this.id = id;
      this.title = title;
      this.content = content;
      this.type = type;
      this.indexed = false;
    }
  
    index(): void {
      this.indexed = true;
    }
  
    unindex(): void {
      this.indexed = false;
    }
  
    bfsSearch(term: string): boolean {
      const queue: string[] = [this.content];
      while (queue.length) {
        const node = queue.shift()!;
        if (node.includes(term)) {
          return true;
        }
      }
      return false;
    }
  
    dfsSearch(term: string): boolean {
      const stack: string[] = [this.content];
      while (stack.length) {
        const node = stack.pop()!;
        if (node.includes(term)) {
          return true;
        }
      }
      return false;
    }
  }
  