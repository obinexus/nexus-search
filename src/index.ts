export * from './types';
export { SearchEngine } from './core/SearchEngine';
export { IndexManager } from './core/IndexManager';
export { QueryProcessor } from './core/QueryProcessor';

// Re-export utility functions
export {
  createSearchableFields,
  optimizeIndex
} from './utils/SearchUtils';

export {
  validateSearchOptions,
  validateIndexConfig,
  validateDocument
} from './utils/ValidationUtils';