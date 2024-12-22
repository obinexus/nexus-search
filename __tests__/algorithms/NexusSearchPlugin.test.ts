

import { IndexedDocument } from '../../types';
import { NexusSearchPlugin } from '../../plugins/'; 

describe("NexusSearchPlugin", () => {
    let plugin: NexusSearchPlugin;
    const documents: IndexedDocument[] = [
        {
            id: "1",
            fields: {
                title: "Document 1",
                content: "This is the content of document 1",
                author: "Author 1",
                tags: ["tag1", "tag2"]
            }
        },
        {
            id: "2",
            fields: {
                title: "Document 2",
                content: "This is the content of document 2",
                author: "Author 2",
                tags: ["tag2", "tag3"]
            }
        }
    ];

    beforeEach(async () => {
        plugin = new NexusSearchPlugin({ documents });
        await plugin.initialize();
    });

    it("should initialize with documents", async () => {
        expect(plugin.length).toBe(2);
    });

    it("should search documents by query", async () => {
        const results = await plugin.search("content of document 1");
        expect(results.length).toBe(1);
        expect(results[0].fields.title).toBe("Document 1");
    });

    it("should search documents by tag", async () => {
        const results = await plugin.searchByTag("tag2");
        expect(results.length).toBe(2);
    });

    it("should add a new document", async () => {
        const newDocument: IndexedDocument = {
            id: "3",
            fields: {
                title: "Document 3",
                content: "This is the content of document 3",
                author: "Author 3",
                tags: ["tag3", "tag4"]
            }
        };
        await plugin.addDocument(newDocument);
        const results = await plugin.search("content of document 3");
        expect(results.length).toBe(1);
        expect(results[0].fields.title).toBe("Document 3");
    });

    it("should remove a document", async () => {
        await plugin.removeDocument("1");
        const results = await plugin.search("content of document 1");
        expect(results.length).toBe(0);
    });

    it("should update a document", async () => {
        const updatedDocument: IndexedDocument = {
            id: "1",
            fields: {
                title: "Updated Document 1",
                content: "This is the updated content of document 1",
                author: "Author 1",
                tags: ["tag1", "tag2"]
            }
        };
        await plugin.updateDocument(updatedDocument);
        const results = await plugin.search("updated content of document 1");
        expect(results.length).toBe(1);
        expect(results[0].fields.title).toBe("Updated Document 1");
    });

    it("should load and search markdown content", async () => {
        const markdownContent = "# Markdown Title\nThis is markdown content.";
        await plugin.loadMarkdown(markdownContent);
        const results = await plugin.search("markdown content");
        expect(results.length).toBe(1);
        expect(results[0].fields.title).toBe("Markdown Title");
    });

    it("should load and search HTML content", async () => {
        const htmlContent = "<h1>HTML Title</h1><p>This is HTML content.</p>";
        await plugin.loadHTML(htmlContent);
        const results = await plugin.search("HTML content");
        expect(results.length).toBe(1);
        expect(results[0].fields.title).toBe("HTML Title");
    });

    it("should search with regex", async () => {
        const results = await plugin.searchWithRegex("content", /document \d/);
        expect(results.length).toBe(2);
    });
});