<template>
  <div class="nexus-search-bar">
    <input
      type="text"
      v-model="query"
      @input="handleInputChange"
      placeholder="Search..."
      class="search-input"
    />
    <div v-if="isLoading" class="loading-spinner"></div>
    <div v-if="results.length > 0" class="search-results">
      <div v-for="(result, index) in results" :key="index" class="search-result">
        <h3>{{ result.item.title }}</h3>
        <p>{{ result.item.content }}</p>
        <div class="tags">
          <span v-for="(tag, tagIndex) in result.item.tags" :key="tagIndex" class="tag">
            {{ tag }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { SearchEngine } from '@obinexuscomputing/nexus-search';

export default {
  name: 'NexusSearchBar',
  setup() {
    const query = ref('');
    const results = ref([]);
    const isLoading = ref(false);
    const searchEngine = ref(null);
    let searchTimeout = null;

    onMounted(async () => {
      searchEngine.value = new SearchEngine({
        name: 'nexus-search-bar',
        version: 1,
        fields: ['title', 'content', 'tags'],
      });
      await searchEngine.value.initialize();

      // Add sample data for testing
      await searchEngine.value.addDocuments([
        {
          title: 'Getting Started',
          content: 'Quick start guide for NexusSearch',
          tags: ['guide', 'documentation'],
        },
        {
          title: 'Advanced Features',
          content: 'Explore advanced search capabilities',
          tags: ['advanced', 'features'],
        },
      ]);
    });

    const handleSearch = async (searchQuery) => {
      if (!searchEngine.value) return;

      isLoading.value = true;
      try {
        const searchResults = await searchEngine.value.search(searchQuery, {
          fuzzy: true,
          maxResults: 5,
        });
        results.value = searchResults;
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        isLoading.value = false;
      }
    };

    const handleInputChange = () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      searchTimeout = setTimeout(() => {
        if (query.value.trim()) {
          handleSearch(query.value);
        } else {
          results.value = [];
        }
      }, 300);
    };

    return {
      query,
      results,
      isLoading,
      handleInputChange,
    };
  },
};
</script>

<style scoped>
.nexus-search-bar {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  margin-bottom: 1rem;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #ccc;
  border-top: 3px solid #333;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

.search-results {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 1rem;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.search-result {
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}

.search-result:last-child {
  border-bottom: none;
}

.search-result h3 {
  font-size: 1.25rem;
  margin: 0;
}

.search-result p {
  margin: 0.5rem 0;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background-color: #007bff;
  color: #fff;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
