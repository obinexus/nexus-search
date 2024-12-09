export interface SearchResult<T> {
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
  results: SearchResult<unknown>[];
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

export interface SearchableField {
  name: string;
  value: string | string[] | number | boolean;
  weight?: number;
}
