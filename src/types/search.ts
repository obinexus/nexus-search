import { DocumentMetadata, DocumentValue } from './utils';

// Remove duplicate types, rename for clarity
export interface GenericSearchResult {
  id: string;
  score: number;
  distance?: number;
  rank?: number;
}

export interface DetailedSearchResult<T> {
  item: T;
  score: number;
  matches: string[];
  highlights?: Record<string, string[]>;
}

export interface IndexedSearchableField {
  value: DocumentValue;
  weight?: number;
  metadata?: DocumentMetadata;
}

export interface NormalizedSearchField {
  original: DocumentValue;
  normalized: string;
  weight: number;
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

export interface SearchContext {
  query: string;
  options: SearchOptions;
  startTime: number;
  results: DetailedSearchResult<unknown>[];
  stats: SearchStats;
}

export interface SearchStats {
  totalResults: number;
  searchTime: number;
  indexSize: number;
  queryComplexity: number;
}

export interface SearchableDocument {
  id: string;
  content: Record<string, string | string[] | number | boolean>;
  metadata?: Record<string, unknown>;
}

export interface SearchNode {
  id?: string;
  score: number;
  children: Map<string, SearchNode>;
}

export interface DetailedSearchResult<T> {
  item: T;
  score: number;
  matches: string[];
  highlights?: Record<string, string[]>;
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

export interface SearchContext {
  query: string;
  options: SearchOptions;
  startTime: number;
  results: DetailedSearchResult<unknown>[];
  stats: SearchStats;
}

export interface SearchStats {
  totalResults: number;
  searchTime: number;
  indexSize: number;
  queryComplexity: number;
}

// types/scoring.ts