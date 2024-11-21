

export * from './types';
export * from './errors';
export * from './events';
export * from './internal';
export * from './guards';
export * from './utils';
export * from './defaults';

// Event types implementation
export type SearchEventType = 
  | 'search:start'
  | 'search:complete'
  | 'search:error'
  | 'index:start'
  | 'index:complete'
  | 'index:error'
  | 'storage:error';

export interface SearchEvent {
  type: SearchEventType;
  timestamp: number;
  data?: any;
  error?: Error;
}

export interface SearchEventListener {
  (event: SearchEvent): void;
}

// Internal types implementation
export interface IndexNode {
  id: string;
  value: any;
  score: number;
  children: Map<string, IndexNode>;
}

export interface SearchContext {
  query: string;
  options: SearchOptions;
  startTime: number;
  results: SearchResult<any>[];
  stats: SearchStats;
}

export interface TokenInfo {
  value: string;
  type: 'word' | 'operator' | 'modifier' | 'delimiter';
  position: number;
  length: number;
}

// Type guards
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

// Utility type functions
export function createSearchStats(): SearchStats {
  return {
    totalResults: 0,
    searchTime: 0,
    indexSize: 0,
    queryComplexity: 0
  };
}

export function createSearchContext(
  query: string,
  options: SearchOptions = {}
): SearchContext {
  return {
    query,
    options,
    startTime: Date.now(),
    results: [],
    stats: createSearchStats()
  };
}

export function createTokenInfo(
  value: string,
  type: TokenInfo['type'],
  position: number
): TokenInfo {
  return {
    value,
    type,
    position,
    length: value.length
  };
}

// Default configurations
export const DEFAULT_INDEX_OPTIONS: Required<IndexOptions> = {
  caseSensitive: false,
  stemming: true,
  stopWords: ['the', 'a', 'an', 'and', 'or', 'but'],
  minWordLength: 2,
  maxWordLength: 50,
  fuzzyThreshold: 0.8
};

export const DEFAULT_SEARCH_OPTIONS: Required<SearchOptions> = {
  fuzzy: false,
  maxResults: 10,
  threshold: 0.5,
  fields: [],
  sortBy: 'score',
  sortOrder: 'desc',
  page: 1,
  pageSize: 10
};

// Export a namespace for internal use
export namespace NexusSearch {
  export interface InternalConfig extends IndexConfig {
    _id: string;
    _created: number;
    _updated: number;
  }

  export interface QueryContext extends SearchContext {
    _processed: boolean;
    _cached: boolean;
  }
}
export interface SearchOptions {
    fuzzy?: boolean;
    maxResults?: number;
    threshold?: number;
    fields?: string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
  }
  
  export interface SearchResult<T> {
    item: T;
    score: number;
    matches: string[];
    highlights?: Record<string, string[]>;
  }
  
  export interface IndexConfig {
    name: string;
    version: number;
    fields: string[];
    options?: IndexOptions;
  }
  
  export interface IndexOptions {
    caseSensitive?: boolean;
    stemming?: boolean;
    stopWords?: string[];
    minWordLength?: number;
    maxWordLength?: number;
    fuzzyThreshold?: number;
  }
  
  export interface SearchStats {
    totalResults: number;
    searchTime: number;
    indexSize: number;
    queryComplexity: number;
  }

  