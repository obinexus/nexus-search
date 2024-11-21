import React, { useState, useEffect, useRef } from 'react';
import { SearchEngine, SearchResult } from '../../../types';

const NexusSearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult<any>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchEngineRef = useRef<SearchEngine | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const initializeSearch = async () => {
      searchEngineRef.current = new SearchEngine({
        name: 'nexus-search-bar',
        version: 1,
        fields: ['title', 'content', 'tags']
      });
      await searchEngineRef.current.initialize();
      
      // Add sample data for testing
      await searchEngineRef.current.addDocuments([
        {
          title: 'Getting Started',
          content: 'Quick start guide for NexusSearch',
          tags: ['guide', 'documentation']
        },
        {
          title: 'Advanced Features',
          content: 'Explore advanced search capabilities',
          tags: ['advanced', 'features']
        }
      ]);
    };

    initializeSearch();
  }, []);

  const handleSearch = async (searchQuery: string) => {
    if (!searchEngineRef.current) return;
    
    setIsLoading(true);
    try {
      const searchResults = await searchEngineRef.current.search(searchQuery, {
        fuzzy: true,
        maxResults: 5
      });
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = event.target.value;
    setQuery(newQuery);

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (newQuery.trim()) {
        handleSearch(newQuery);
      } else {
        setResults([]);
      }
    }, 300);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search..."
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="nexus-search-input"
        />
        {isLoading && (
          <div className="absolute right-3 top-2.5">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="mt-4 border rounded-lg shadow-lg" data-testid="search-results">
          {results.map((result, index) => (
            <div
              key={index}
              className="p-4 border-b last:border-b-0 hover:bg-gray-50"
              data-testid={`search-result-${index}`}
            >
              <h3 className="font-semibold text-lg">{result.item.title}</h3>
              <p className="text-gray-600 mt-1">{result.item.content}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.item.tags.map((tag: string, tagIndex: number) => (
                  <span
                    key={tagIndex}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NexusSearchBar;