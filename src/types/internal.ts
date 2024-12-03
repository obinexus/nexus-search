import { SearchOptions, SearchResult, SearchStats } from './models';

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


