const { SearchEngine, IndexedDocument } = require('../../dist/index.cjs').default;

// Initialize search engine
const searchEngine = new SearchEngine({
    name: 'my-search-index',
    version: 1,
    fields: ['title', 'content', 'tags']
});

async function main() {
    // Initialize the search engine
    await searchEngine.initialize();
    console.log('Search engine initialized.');

// Initialize with proper config

// Create properly structured documents
const documents = [
    new IndexedDocument({
        id: 'doc1',
        fields: {
            title: 'Getting Started with Node.js',
            content: 'Node.js is a JavaScript runtime...',
            tags: ['nodejs', 'javascript']
        }
    })
];

// Add documents
await searchEngine.addDocuments(documents);

// Search with proper options
const results = await searchEngine.search('nodejs', {
    fuzzy: true,
    maxResults: 5,
    fields: ['title', 'content']
});

    console.log('Search results:', results); // is an array of search results(currently empty)Search results: []

}

main().catch(console.error);
async function additionalSearch() {
    // Create a document
    const doc = new IndexedDocument({
        id: 'test-1',
        fields: {
            title: 'Test Document',
            content: 'Test content',
            author: 'Test Author',
            tags: ['test']
        },
        metadata: {
            indexed: Date.now(),
            lastModified: Date.now()
        }
    });

    // Use in search engine
    await searchEngine.addDocuments([doc]);

    // Perform search
    const results = await searchEngine.search('test', {
        fuzzy: true,
        fields: ['title', 'content']
    });

    console.log('Search results:', results);
}

(async () => {
    await additionalSearch().catch(console.error);
})();