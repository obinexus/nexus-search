import { SearchStats, SearchOptions } from './models';
import { SearchContext, TokenInfo } from './internal';

export function createSearchStats(): SearchStats {
  return {
    totalResults: 0,
    searchTime: 0,
    indexSize: 0,
    queryComplexity: 0
  };
}

export function createSearchContext(query: string, options: SearchOptions = {}): SearchContext {
  return {
    query,
    options,
    startTime: Date.now(),
    results: [],
    stats: createSearchStats()
  };
}

export function createTokenInfo(value: string, type: TokenInfo['type'], position: number): TokenInfo {
  return {
    value,
    type,
    position,
    length: value.length
  };
}
