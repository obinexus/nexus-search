import type { SearchOptions, IndexConfig, SearchResult } from './types';
export declare function isSearchOptions(obj: any): obj is SearchOptions;
export declare function isIndexConfig(obj: any): obj is IndexConfig;
export declare function isSearchResult<T>(obj: any): obj is SearchResult<T>;
