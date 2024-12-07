import { TokenInfo } from "./internal";
import { SearchContext, SearchOptions, SearchStats } from "./search";
export declare function createSearchStats(): SearchStats;
export declare function createSearchContext(query: string, options?: SearchOptions): SearchContext;
export declare function createTokenInfo(value: string, type: TokenInfo['type'], position: number): TokenInfo;
