export type SearchEventType = 
    | 'search:start'
    | 'search:complete'
    | 'search:error'
    | 'index:start'
    | 'index:complete'
    | 'index:error'
    | 'storage:error';
  
  export interface SearchEvent {
    type: SearchEventType;
    timestamp: number;
    data?: any;
    error?: Error;
  }
  
  export interface SearchEventListener {
    (event: SearchEvent): void;
  }


export interface SearchEvent {
  type: SearchEventType;
  timestamp: number;
  data?: any;
  error?: Error;
}

export interface SearchEventListener {
  (event: SearchEvent): void;
}