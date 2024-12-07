import { DBSchema } from "./database";
import { IndexConfig } from "./types";

export interface SearchDBSchema extends DBSchema {
    searchIndices: {
      key: string;
      value: {
        id: string;
        data: any;
        timestamp: number;
      };
      indexes: { 'timestamp': number };
    };
    metadata: {
      key: string;
      value: MetadataEntry;
      indexes: { 'lastUpdated': number };
    };
  }
  
  export interface MetadataEntry {
    id: string;
    config: IndexConfig;
    lastUpdated: number;
  }
  