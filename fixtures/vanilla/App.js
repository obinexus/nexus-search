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

    async initialize() {
        try {
            this.showLoading();
            if (!window.NexusSearch) {
                throw new Error('NexusSearch library not loaded');
            }
            
            this.searchEngine = new window.NexusSearch.SearchEngine({
                name: 'nexus-search-bar',
                version: 1,
                fields: ['title', 'content', 'tags']
            });

            await this.searchEngine.initialize();
            // Rest of the initialization code remains the same
        } catch (error) {
            this.showError('Failed to initialize search engine: ' + error.message);
            console.error('Initialization error:', error);
        }
    }

    setupEventListeners() {
        this.input.addEventListener('input', this.handleInput.bind(this));
    }

    handleInput(event) {
        const query = event.target.value.trim();

        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        this.searchTimeout = setTimeout(() => {
            if (query) {
                this.performSearch(query);
            } else {
                this.clearResults();
            }
        }, 300);
    }

    async performSearch(query) {
        if (!this.searchEngine) return;

        try {
            this.showLoading();
            this.hideError();

            const results = await this.searchEngine.search(query, {
                fuzzy: true,
                maxResults: 5
            });

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

        if (results.length === 0) {
            this.noResults.style.display = 'block';
            this.resultsContainer.style.display = 'none';
            return;
        }

        this.noResults.style.display = 'none';
        this.resultsContainer.style.display = 'block';

        results.forEach(result => {
            const resultElement = document.createElement('div');
            resultElement.className = 'search-result';
            resultElement.innerHTML = `
                <h3>${result.item.title}</h3>
                <p>${result.item.content}</p>
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
    }

    hideLoading() {
        this.spinner.style.display = 'none';
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
    const searchContainer = document.querySelector('.search-container');
    new NexusSearchBar(searchContainer);
});