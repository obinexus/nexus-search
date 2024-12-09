import { IndexConfig } from "./compactability";
import { SearchOptions, SearchResult } from "./search";

  
  export function isSearchOptions(obj: unknown): obj is SearchOptions {
    return obj && (
      typeof obj.fuzzy === 'undefined' || typeof obj.fuzzy === 'boolean'
    ) && (
      typeof obj.maxResults === 'undefined' || typeof obj.maxResults === 'number'
    );
  }
  
  export function isIndexConfig(obj: unknown): obj is IndexConfig {
    return obj && 
      typeof obj.name === 'string' &&
      typeof obj.version === 'number' &&
      Array.isArray(obj.fields);
  }
  
  export function isSearchResult<T>(obj: unknown): obj is SearchResult<T> {
    return obj &&
      'item' in obj &&
      typeof obj.score === 'number' &&
      Array.isArray(obj.matches);
  }
  

  

  