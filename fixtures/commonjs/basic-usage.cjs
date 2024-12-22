const { SearchEngine } = require('../../dist/index.cjs');

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

    // Add documents to the index
    const documents = [
        {
            title: 'Getting Started with Node.js',
            content: 'Node.js is a JavaScript runtime built on Chrome\'s V8 JavaScript engine.',
            tags: ['nodejs', 'javascript', 'runtime']
        },
        {
            title: 'Advanced Node.js Patterns',
            content: 'Explore advanced patterns and techniques in Node.js development.',
            tags: ['nodejs', 'advanced', 'patterns']
        }
    ];
    await searchEngine.addDocuments(documents);
    console.log('Documents added:', documents);

    // Perform a search
    const results = await searchEngine.search('nodejs', {
        fuzzy: true,
        maxResults: 5
    });

    console.log('Search Results:', await results);
}

main().catch(console.error);