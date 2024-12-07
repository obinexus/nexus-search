import { IndexOptions } from "./compactablity";
import { SearchOptions } from "./search";

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
