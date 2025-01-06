import { SearchEngine } from "@/core";
import { SearchOptions, SearchResult, DocumentContent, DocumentBase } from "@/types";
import { IndexedDocument } from "@/storage";

interface NexusDocument {
    id: string;
    title: string;
    content: string;
    path: string;
    type: string;
}

export class NexusDocumentAdapter {
    private documents: NexusDocument[] = [];
    private searchEngine: SearchEngine;

    constructor() {
        this.searchEngine = new SearchEngine({
            name: 'nexus-document-adapter',
            version: 1,
            fields: ['title', 'content', 'path', 'type'],
            storage: { type: 'memory' },
            indexing: {
                enabled: true,
                fields: ['title', 'content'],
                options: {
                    tokenization: true,
                    caseSensitive: false,
                    stemming: true
                }
            },
            searchFields: ['title', 'content'],
            metadataFields: ['path', 'type'],
            searchOptions: {
                fuzzy: true,
                maxDistance: 2,
                includeMatches: true
            }
        });
    }

    async addDocument(document: NexusDocument): Promise<void> {
        this.documents.push(document);
        const indexedDocument: IndexedDocument = {
          id: document.id,
          fields: {
            title: document.title,
            content: document.content as unknown as DocumentContent,
            path: document.path,
            type: document.type,
            author: '',
            tags: [],
            version: "1"
          },
          versions: [],
          relations: [],
          author: '',

          metadata: {},
          tags: [],
          version: "1",
          document: () => indexedDocument,
          base: () => ({} as DocumentBase),
          links: [],
          ranks: [],
          content: document.content as unknown as DocumentContent,
          title: "",
        } as unknown as IndexedDocument;
        await this.searchEngine.addDocument(indexedDocument);
    }

    async removeDocumentById(id: string): Promise<void> {
        this.documents = this.documents.filter(doc => doc.id !== id);
        await this.searchEngine.removeDocument(id);
    }

    async search(query: string, options?: Partial<SearchOptions>): Promise<NexusDocument[]> {
        const results = await this.searchEngine.search(query, options);
        return results.map((result: SearchResult<unknown>) => result.document as unknown as NexusDocument);
    }

    getDocuments(): NexusDocument[] {
        return this.documents;
    }
}

export class NexusDocumentPlugin {
    private adapter: NexusDocumentAdapter;

    constructor(adapter: NexusDocumentAdapter) {
        this.adapter = adapter;
    }

    async indexDocuments(): Promise<number> {
        // Placeholder: simulate indexing documents from a directory
        const mockDocuments: NexusDocument[] = [
            { id: '1', title: 'Doc1', content: 'Content of Doc1', path: '/docs/doc1.md', type: 'md' },
            { id: '2', title: 'Doc2', content: 'Content of Doc2', path: '/docs/doc2.html', type: 'html' }
        ];

        for (const doc of mockDocuments) {
            await this.adapter.addDocument(doc);
        }
        return mockDocuments.length;
    }

    async bfsSearch(startDocId: string, query: string): Promise<NexusDocument | null> {
        // BFS Search logic for documents
        const visited = new Set<string>();
        const queue: NexusDocument[] = [this.adapter.getDocuments().find(doc => doc.id === startDocId)!];

        while (queue.length) {
            const current = queue.shift();
            if (!current || visited.has(current.id)) continue;

            visited.add(current.id);
            if (current.content.includes(query)) return current;

            // Simulate adjacent nodes by adding other documents to the queue
            queue.push(...this.adapter.getDocuments().filter(doc => !visited.has(doc.id)));
        }

        return null;
    }

    async dfsSearch(startDocId: string, query: string): Promise<NexusDocument | null> {
        // DFS Search logic for documents
        const visited = new Set<string>();
        const stack: NexusDocument[] = [this.adapter.getDocuments().find(doc => doc.id === startDocId)!];

        while (stack.length) {
            const current = stack.pop();
            if (!current || visited.has(current.id)) continue;

            visited.add(current.id);
            if (current.content.includes(query)) return current;

            // Simulate adjacent nodes by adding other documents to the stack
            stack.push(...this.adapter.getDocuments().filter(doc => !visited.has(doc.id)));
        }

        return null;
    }
}
