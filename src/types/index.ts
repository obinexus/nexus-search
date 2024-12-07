// Reference imports for type definitions
/// <reference path="./types.ts" />
/// <reference path="./errors.ts" />
/// <reference path="./events.ts" />
/// <reference path="./internal.ts" />
/// <reference path="./guards.ts" />
/// <reference path="./utils.ts" />
/// <reference path="./defaults.ts" />
/// <reference path="./document.ts" />
/// <reference path="./models.ts" />
/// <reference path="./search.ts" />
/// <reference path="./storage.ts"/>
/// <reference path="database.ts"/>

export namespace NexusSearch {
    // Base interfaces
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
  
    export interface SearchContext {
      query: string;
      options: SearchOptions;
      startTime: number;
      results: SearchResult<any>[];
      stats: SearchStats;
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
  
    // Constants
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
  
    // Error types
    export class SearchError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'SearchError';
      }
    }
  
    export class IndexError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'IndexError';
      }
    }
  
    // Event types
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
  
    // Document types
    export interface DocumentLink {
      fromId: string;
      toId: string;
      weight: number;
    }
  
    export interface DocumentRank {
      id: string;
      rank: number;
      incomingLinks: number;
      outgoingLinks: number;
    }
  
    // Internal types
    export interface InternalConfig extends IndexConfig {
      _id: string;
      _created: number;
      _updated: number;
    }
  
    export interface QueryContext extends SearchContext {
      _processed: boolean;
      _cached: boolean;
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
  }
  
  // Export the namespace as the default export
  export default NexusSearch;
  
  // Re-export for backward compatibility
  export type {
    NexusSearch as Types
  };