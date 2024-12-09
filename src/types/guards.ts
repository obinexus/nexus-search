import { IndexConfig } from "./compactability";
import { SearchOptions, SearchResult } from "./search";

  
export function isSearchOptions(obj: unknown): obj is SearchOptions {
  return (
      typeof obj === 'object' &&
      obj !== null &&
      (typeof obj.fuzzy === 'undefined' || typeof obj.fuzzy === 'boolean') &&
      (typeof obj.maxResults === 'undefined' || typeof obj.maxResults === 'number')
  );
}

export function isIndexConfig(obj: unknown): obj is IndexConfig {
  return (
      typeof obj === 'object' &&
      obj !== null &&
      typeof obj.name === 'string' &&
      typeof obj.version === 'number' &&
      Array.isArray(obj.fields)
  );
}

export function isSearchResult<T>(obj: unknown): obj is SearchResult<T> {
  return (
      typeof obj === 'object' &&
      obj !== null &&
      'item' in obj &&
      typeof (obj as any).score === 'number' &&
      Array.isArray((obj as any).matches)
  );
}

  

  