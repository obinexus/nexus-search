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
