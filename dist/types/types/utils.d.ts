import { SearchStats, SearchOptions } from './models';
import { SearchContext, TokenInfo } from './internal';
export declare function createSearchStats(): SearchStats;
export declare function createSearchContext(query: string, options?: SearchOptions): SearchContext;
export declare function createTokenInfo(value: string, type: TokenInfo['type'], position: number): TokenInfo;
