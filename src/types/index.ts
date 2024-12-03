import { SearchContext } from './internal';


export * from './types';
export * from './errors';
export * from './events';
export * from './internal';
export * from './guards';
export * from './utils';
export * from './defaults';



// Export a namespace for expornal use
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

 