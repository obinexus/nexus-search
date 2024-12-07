import { IndexConfig } from "./models";
import { SearchOptions, SearchResult } from "./search";

  
  export function isSearchOptions(obj: any): obj is SearchOptions {
    return obj && (
      typeof obj.fuzzy === 'undefined' || typeof obj.fuzzy === 'boolean'
    ) && (
      typeof obj.maxResults === 'undefined' || typeof obj.maxResults === 'number'
    );
  }
  
  export function isIndexConfig(obj: any): obj is IndexConfig {
    return obj && 
      typeof obj.name === 'string' &&
      typeof obj.version === 'number' &&
      Array.isArray(obj.fields);
  }
  
  export function isSearchResult<T>(obj: any): obj is SearchResult<T> {
    return obj &&
      'item' in obj &&
      typeof obj.score === 'number' &&
      Array.isArray(obj.matches);
  }
  

  

  