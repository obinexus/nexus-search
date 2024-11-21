type QueryToken = {
  type: 'term' | 'operator' | 'modifier';
  value: string;
};

export class QueryProcessor {
  private readonly STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for',
    'from', 'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on',
    'that', 'the', 'to', 'was', 'were', 'will', 'with'
  ]);

  process(query: string): string {
    const tokens = this.tokenize(query);
    const processedTokens = this.processTokens(tokens);
    return this.optimizeQuery(processedTokens);
  }

  private tokenize(query: string): QueryToken[] {
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 0)
      .map(term => this.classifyToken(term));
  }

  private classifyToken(term: string): QueryToken {
    if (term.startsWith('+') || term.startsWith('-')) {
      return { type: 'operator', value: term };
    }
    if (term.includes(':')) {
      return { type: 'modifier', value: term };
    }
    return { type: 'term', value: term };
  }

  private processTokens(tokens: QueryToken[]): QueryToken[] {
    return tokens
      .filter(token => 
        token.type !== 'term' || !this.STOP_WORDS.has(token.value)
      )
      .map(token => this.normalizeToken(token));
  }

  private normalizeToken(token: QueryToken): QueryToken {
    if (token.type === 'term') {
      // Basic stemming (could be enhanced with proper stemming algorithm)
      let value = token.value;
      if (value.endsWith('ing')) value = value.slice(0, -3);
      if (value.endsWith('s')) value = value.slice(0, -1);
      return { ...token, value };
    }
    return token;
  }

  private optimizeQuery(tokens: QueryToken[]): string {
    return tokens
      .map(token => token.value)
      .join(' ');
  }
}