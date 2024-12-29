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

    // Extract quoted phrases
    let tempQuery = query;
    // const quotes = new Map<string, string>();
    let quoteMatch;
    const quoteRegex = /"[^"]+"|"[^"]*$/g;

    while ((quoteMatch = quoteRegex.exec(tempQuery)) !== null) {
      const quote = quoteMatch[0];
      tempQuery = tempQuery.replace(quote, ` ${quote} `);
    }

    const tokens = this.tokenize(tempQuery);
    const processedTokens = this.processTokens(tokens);
    return this.optimizeQuery(processedTokens);
  }

  private tokenize(query: string): QueryToken[] {
    return query
      .split(/\s+/)
      .filter(term => term.length > 0)
      .map(term => {
        // Preserve quotes as-is
        if (term.startsWith('"') && term.endsWith('"')) {
          return { type: 'term', value: term };
        }
        return this.classifyToken(term.toLowerCase());
      });
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
      .filter(token => {
        if (token.type !== 'term') return true;
        if (token.value.startsWith('"')) return true;
        return !this.STOP_WORDS.has(token.value);
      })
      .map(token => this.normalizeToken(token));
  }

  private normalizeToken(token: QueryToken): QueryToken {
    if (token.type === 'term' && !token.value.startsWith('"')) {
      let value = token.value;
      
      // Handle 'ing' ending
      if (value.endsWith('ing')) {
        // Keep root word - remove 'ing' and restore any dropped consonant
        value = value.endsWith('ying') ? value.slice(0, -4) + 'y' :
               value.endsWith('pping') ? value.slice(0, -4) :
               value.slice(0, -3);
      }
      
      // Handle 'ies' plurals
      if (value.endsWith('ies')) {
        value = value.slice(0, -3) + 'y';
      }
      // Handle regular plurals but not words ending in 'ss'
      else if (value.endsWith('s') && !value.endsWith('ss')) {
        value = value.slice(0, -1);
      }
      
      // Handle 'ed' ending
      if (value.endsWith('ed')) {
        value = value.slice(0, -2);
      }

      return { ...token, value };
    }
    return token;
  }

  private optimizeQuery(tokens: QueryToken[]): string {
    return tokens
      .map(token => token.value)
      .join(' ')
      .trim()
      .replace(/\s+/g, ' ');  // normalize spaces
  }
}