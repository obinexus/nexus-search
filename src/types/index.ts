
export * from './types';
export * from './errors';
export * from './events';
export * from './guards';
export * from './utils';
export * from './defaults';
export * from './document';

// Export a namespace for expornal use
export namespace NexusSearch {
 
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

  
  export interface SearchStats {
    totalResults: number;
    searchTime: number;
    indexSize: number;
    queryComplexity: number;
  }

}