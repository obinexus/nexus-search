export type SearchEventType = 'search:start' | 'search:complete' | 'search:error' | 'index:start' | 'index:complete' | 'index:error' | 'storage:error' | 'remove:start' | 'remove:complete' | 'remove:error' | 'update:start' | 'update:complete' | 'update:error';
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
