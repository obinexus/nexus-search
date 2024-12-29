import { QueryToken } from "@/types";

export class QueryProcessor {
  private readonly STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for',
    'from', 'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on',
    'that', 'the', 'to', 'was', 'were', 'will', 'with'
  ]);

  process(query: string | null | undefined): string {
    if (query == null) return '';
    if (typeof query !== 'string') return String(query);

    // Handle quoted phrases
    const quotes = query.match(/"[^"]+"/g) || [];
    let processedQuery = query;
    const placeholders: Record<string, string> = {};

    // Replace quoted phrases with placeholders
    quotes.forEach((quote, i) => {
      const placeholder = `__QUOTE_${i}__`;
      placeholders[placeholder] = quote;
      processedQuery = processedQuery.replace(quote, placeholder);
    });

    const tokens = this.tokenize(processedQuery);
    const processedTokens = this.processTokens(tokens);
    let result = this.optimizeQuery(processedTokens);

    // Restore quoted phrases
    Object.entries(placeholders).forEach(([placeholder, quote]) => {
      result = result.replace(placeholder, quote);
    });

    return result;
  }

  private tokenize(query: string): QueryToken[] {
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 0)
      .map(term => this.classifyToken(term));
  }

  private classifyToken(term: string): QueryToken {
    // Handle quoted phrases
    if (term.startsWith('"') && term.endsWith('"')) {
      return { type: 'term', value: term };
    }
    
    // Handle operators
    if (term.startsWith('+') || term.startsWith('-')) {
      return { type: 'operator', value: term };
    }
    
    // Handle modifiers
    if (term.includes(':')) {
      return { type: 'modifier', value: term };
    }

    // Regular terms
    return { type: 'term', value: term };
  }

  private processTokens(tokens: QueryToken[]): QueryToken[] {
    return tokens
      .filter(token => 
        token.type !== 'term' || 
        !this.STOP_WORDS.has(token.value) ||
        token.value.startsWith('"')
      )
      .map(token => this.normalizeToken(token));
  }

  private normalizeToken(token: QueryToken): QueryToken {
    if (token.type === 'term' && !token.value.startsWith('"')) {
      let value = token.value;
      
      // Handle common suffixes
      if (value.endsWith('ing')) value = value.slice(0, -3);
      if (value.endsWith('ed')) value = value.slice(0, -2);
      if (value.endsWith('s') && !value.endsWith('ss')) value = value.slice(0, -1);
      
      return { ...token, value };
    }
    return token;
  }

  private optimizeQuery(tokens: QueryToken[]): string {
    return tokens
      .map(token => token.value)
      .join(' ')
      .trim();
  }
}