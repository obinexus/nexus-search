
import NexusSearch from '/dist/index.esm.js';

console.log(window.NexusSearch)
window.NexusSearch = NexusSearch;
class NexusSearchBar {
    constructor(container) {
        this.container = container;
        this.searchEngine = null;
        this.searchTimeout = null;
        this.posts = [];

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
            this.showLoading();
            console.log('Fetching posts...');

            // Fetch posts and comments from JSONPlaceholder API
            const [postsResponse, commentsResponse] = await Promise.all([
                fetch('https://jsonplaceholder.typicode.com/posts'),
                fetch('https://jsonplaceholder.typicode.com/comments')
            ]);

            if (!postsResponse.ok || !commentsResponse.ok) {
                throw new Error('Failed to fetch data from API');
            }

            const posts = await postsResponse.json();
            const comments = await commentsResponse.json();

            console.log('Fetched posts:', posts.length);
            console.log('Fetched comments:', comments.length);

            // Group comments by post
            const commentsByPost = comments.reduce((acc, comment) => {
                if (!acc[comment.postId]) {
                    acc[comment.postId] = [];
                }
                acc[comment.postId].push(comment);
                return acc;
            }, {});

            // Format posts for search engine
            const formattedPosts = posts.map(post => ({
                title: this.capitalizeFirstLetter(post.title),
                content: this.capitalizeFirstLetter(post.body),
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

            console.log('Formatted posts:', formattedPosts.length);
            return formattedPosts;

        } catch (error) {
            console.error('Error fetching posts:', error);
            throw new Error('Failed to load blog posts: ' + error.message);
        }
    }

    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    async initialize() {
        try {
            this.showLoading();
            console.log('Initializing search engine...');
            
            if (!window.NexusSearch) {
                throw new Error('NexusSearch library not loaded');
            }

            this.searchEngine = new window.NexusSearch.SearchEngine({
                name: 'nexus-search-bar',
                version: 1,
                fields: ['title', 'content', 'tags', 'author']
            });

            await this.searchEngine.initialize();
            console.log('Search engine initialized');

            // Fetch and index blog posts
            this.posts = await this.fetchPosts();
            console.log('Adding documents to search engine...');
            await this.searchEngine.addDocuments(this.posts);
            console.log('Documents added:', this.posts.length);

            this.setupEventListeners();
            this.hideError();
            console.log('Initialization complete');
        } catch (error) {
            this.showError('Failed to initialize search engine: ' + error.message);
            console.error('Initialization error:', error);
        } finally {
            this.hideLoading();
        }
    }

    setupEventListeners() {
        // Remove any existing listeners
        this.input?.removeEventListener('input', this.handleInput.bind(this));
        this.input?.addEventListener('input', this.handleInput.bind(this));
        console.log('Event listeners set up');
    }

    handleInput = (event) => {
        const query = event.target.value.trim();

        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        this.searchTimeout = setTimeout(() => {
            if (query) {
                console.log('Searching for:', query);
                this.performSearch(query);
            } else {
                this.clearResults();
            }
        }, 300);
    }

    async performSearch(query) {
        if (!this.searchEngine) {
            this.showError('Search engine not initialized');
            return;
        }

        try {
            this.showLoading();
            this.hideError();

            console.log('Performing search for:', query);
            const results = await this.searchEngine.search(query, {
                fuzzy: true,
                maxResults: 10
            });
            console.log('Search results:', results);

            this.renderResults(results);
        } catch (error) {
            this.showError('Search failed. Please try again.');
            console.error('Search error:', error);
        } finally {
            this.hideLoading();
        }
    }

    renderResults(results) {
        this.resultsContainer.innerHTML = '';
        console.log('Rendering results:', results);

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
            const comments = result.item.comments || [];
            const commentPreview = comments.length > 0 
                ? `<div class="comments-preview">
                     <strong>${comments.length} comments</strong>
                     <p>${comments[0].body.slice(0, 100)}...</p>
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

    showLoading() {
        this.spinner.style.display = 'block';
        if (this.input) this.input.disabled = true;
    }

    hideLoading() {
        this.spinner.style.display = 'none';
        if (this.input) this.input.disabled = false;
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
    }

    hideError() {
        this.errorMessage.style.display = 'none';
    }

    clearResults() {
        this.resultsContainer.innerHTML = '';
        this.noResults.style.display = 'none';
    }
}

// Initialize search bar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, checking for NexusSearch...');
    const checkLibrary = setInterval(() => {
        if (window.NexusSearch) {
            clearInterval(checkLibrary);
            console.log('NexusSearch found, initializing search bar...');
            const searchContainer = document.querySelector('.search-container');
            new NexusSearchBar(searchContainer);
        }
    }, 100);

    setTimeout(() => {
        clearInterval(checkLibrary);
        const searchContainer = document.querySelector('.search-container');
        const errorMessage = searchContainer.querySelector('.error-message');
        if (!window.NexusSearch) {
            console.error('NexusSearch library failed to load');
            errorMessage.textContent = 'Failed to load NexusSearch library';
            errorMessage.style.display = 'block';
        }
    }, 5000);
});