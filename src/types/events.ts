export type SearchEventType =
    | 'engine:initialized'
    | 'index:start'
    | 'index:complete'
    | 'index:error'
    | 'search:start'
    | 'search:complete'
    | 'search:error'
    | 'update:complete'
    | 'update:error'
    | 'remove:complete'
    | 'remove:error'
    | 'storage:error'
    | 'index:clear'
    | 'index:clear:error';

export interface SearchEvent {
    type: SearchEventType;
    timestamp: number;
    data?: unknown;
    error?: Error;
    region?: string;
    regex?: RegExp;
}

export interface SearchEventListener {
    (event: SearchEvent): void;
}
