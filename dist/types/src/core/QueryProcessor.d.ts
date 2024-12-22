export declare class QueryProcessor {
    private readonly STOP_WORDS;
    process(query: string): string;
    private tokenize;
    private classifyToken;
    private processTokens;
    private normalizeToken;
    private optimizeQuery;
}
