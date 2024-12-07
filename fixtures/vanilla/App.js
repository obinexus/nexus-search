class NexusSearchBar {
    constructor(container) {
        this.container = container;
        this.searchEngine = null;
        this.searchTimeout = null;

        // Cache DOM elements
        this.input = container.querySelector('.search-input');
        this.spinner = container.querySelector('.loading-spinner');
        this.errorMessage = container.querySelector('.error-message');
        this.resultsContainer = container.querySelector('.search-results');
        this.noResults = container.querySelector('.no-results');

        this.initialize();
    }

    async fetchPosts() {
        try {
            // Fetch posts and comments from JSONPlaceholder API
            const [postsResponse, commentsResponse] = await Promise.all([
                fetch('https://jsonplaceholder.typicode.com/posts'),
                fetch('https://jsonplaceholder.typicode.com/comments')
            ]);

            const posts = await postsResponse.json();
            const comments = await commentsResponse.json();

            // Group comments by post
            const commentsByPost = comments.reduce((acc, comment) => {
                if (!acc[comment.postId]) {
                    acc[comment.postId] = [];
                }
                acc[comment.postId].push(comment);
                return acc;
            }, {});

            // Format posts for search engine
            return posts.map(post => ({
                title: post.title,
                content: post.body,
                tags: [
                    'blog',
                    `user-${post.userId}`,
                    `post-${post.id}`,
                    ...(commentsByPost[post.id] ? ['has-comments'] : [])
                ],
                comments: commentsByPost[post.id] || [],
                author: `User ${post.userId}`,
                postId: post.id
            }));
        } catch (error) {
            console.error('Error fetching posts:', error);
            throw new Error('Failed to load blog posts');
        }
    }

    async initialize() {
        try {
            this.showLoading();
            
            if (!window.NexusSearch) {
                throw new Error('NexusSearch library not loaded');
            }

            this.searchEngine = new window.NexusSearch.SearchEngine({
                name: 'nexus-search-bar',
                version: 1,
                fields: ['title', 'content', 'tags', 'author']
            });

            await this.searchEngine.initialize();

            // Fetch and index blog posts
            const posts = await this.fetchPosts();
            await this.searchEngine.addDocuments(posts);

            this.setupEventListeners();
            this.hideError();
        } catch (error) {
            this.showError('Failed to initialize search engine: ' + error.message);
            console.error('Initialization error:', error);
        } finally {
            this.hideLoading();
        }
    }

    renderResults(results) {
        this.resultsContainer.innerHTML = '';

        if (!results || results.length === 0) {
            this.noResults.style.display = 'block';
            this.resultsContainer.style.display = 'none';
            return;
        }

        this.noResults.style.display = 'none';
        this.resultsContainer.style.display = 'block';

        results.forEach(result => {
            const resultElement = document.createElement('div');
            resultElement.className = 'search-result';

            // Get comment preview if available
            const commentPreview = result.item.comments.length > 0 
                ? `<div class="comments-preview">
                     <strong>${result.item.comments.length} comments</strong>
                     <p>${result.item.comments[0].body.slice(0, 100)}...</p>
                   </div>`
                : '';

            resultElement.innerHTML = `
                <h3>${result.item.title}</h3>
                <div class="meta">
                    <span class="author">By ${result.item.author}</span>
                    <span class="post-id">Post #${result.item.postId}</span>
                </div>
                <p>${result.item.content}</p>
                ${commentPreview}
                <div class="tags">
                    ${result.item.tags.map(tag => `
                        <span class="tag">${tag}</span>
                    `).join('')}
                </div>
                <div class="score">
                    Score: ${(result.score * 100).toFixed(0)}%
                </div>
            `;
            this.resultsContainer.appendChild(resultElement);
        });
    }

    // ... rest of the SearchBar implementation remains the same ...
}

// Ensure the DOM and NexusSearch library are loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
    const checkLibrary = setInterval(() => {
        if (window.NexusSearch) {
            clearInterval(checkLibrary);
            const searchContainer = document.querySelector('.search-container');
            new NexusSearchBar(searchContainer);
        }
    }, 100);

    setTimeout(() => {
        clearInterval(checkLibrary);
        const searchContainer = document.querySelector('.search-container');
        const errorMessage = searchContainer.querySelector('.error-message');
        if (!window.NexusSearch) {
            errorMessage.textContent = 'Failed to load NexusSearch library';
            errorMessage.style.display = 'block';
        }
    }, 5000);
});