import { QueryToken } from "@/types";

export class QueryProcessor {
  // Expanded stop words list
  private readonly STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 
    'to', 'was', 'were', 'will', 'with', 'this', 'they', 'but', 'have',
    'had', 'what', 'when', 'where', 'who', 'which', 'why', 'how'
  ]);

  // Common word endings for normalization
  private readonly WORD_ENDINGS = {
    PLURAL: /(ies|es|s)$/i,
    GERUND: /ing$/i,
    PAST_TENSE: /(ed|d)$/i,
    COMPARATIVE: /er$/i,
    SUPERLATIVE: /est$/i,
    ADVERB: /ly$/i
  };

  // Special characters to preserve
  private readonly SPECIAL_CHARS = /[!@#$%^&*(),.?":{}|<>]/g;

  process(query: string | null | undefined): string {
    if (!query) return '';
    
    // Initial sanitization
    const sanitizedQuery = this.sanitizeQuery(String(query));
    
    // Handle phrases and operators
    const { phrases, remaining } = this.extractPhrases(sanitizedQuery);
    const tokens = this.tokenize(remaining);
    
    // Process tokens
    const processedTokens = this.processTokens(tokens);
    
    // Reconstruct query with phrases
    return this.reconstructQuery(processedTokens, phrases);
  }

  private sanitizeQuery(query: string): string {
    return query
      .trim()
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/['"]/g, '"'); // Normalize quotes
  }

  private extractPhrases(query: string): { phrases: string[], remaining: string } {
    const phrases: string[] = [];
    let remaining = query;

    // Handle both complete and incomplete quoted phrases
    const phraseRegex = /"([^"]+)"|"([^"]*$)/g;
    remaining = remaining.replace(phraseRegex, (_match, phrase) => {
      if (phrase) {
        phrases.push(`"${phrase.trim()}"`);
        return ' ';
      }
      return '';
    });

    return { phrases, remaining: remaining.trim() };
  }

  private tokenize(text: string): QueryToken[] {
    return text
      .split(/\s+/)
      .filter(term => term.length > 0)
      .map(term => this.createToken(term));
  }

  private createToken(term: string): QueryToken {
    const lowerTerm = term.toLowerCase();
    
    // Handle operators
    if (['+', '-', '!'].includes(term[0])) {
      return {
        type: 'operator',
        value: term,
        original: term
      };
    }
    
    // Handle field modifiers
    if (term.includes(':')) {
      const [field, value] = term.split(':');
      return {
        type: 'modifier',
        value: `${field.toLowerCase()}:${value}`,
        field,
        original: term
      };
    }
    
    // Regular terms
    return {
      type: 'term',
      value: lowerTerm,
      original: term
    };
  }

  private processTokens(tokens: QueryToken[]): QueryToken[] {
    return tokens
      .filter(token => this.shouldKeepToken(token))
      .map(token => this.normalizeToken(token));
  }

  private shouldKeepToken(token: QueryToken): boolean {
    // Keep operators and modifiers
    if (token.type !== 'term') return true;
    
    // Keep terms not in stop words
    return !this.STOP_WORDS.has(token.value.toLowerCase());
  }

  private normalizeToken(token: QueryToken): QueryToken {
    if (token.type !== 'term') return token;

    let value = token.value;

    // Don't normalize if it contains special characters
    if (this.SPECIAL_CHARS.test(value)) return token;

    // Apply word ending normalizations
    value = this.normalizeWordEndings(value);

    return { ...token, value };
  }

  private normalizeWordEndings(word: string): string {
    // Don't normalize short words
    if (word.length <= 3) return word;

    let normalized = word;

    // Check exceptions before applying rules
    if (!this.isNormalizationException(word)) {
      // Order matters: apply most specific rules first
      if (this.WORD_ENDINGS.SUPERLATIVE.test(normalized)) {
        normalized = normalized.replace(this.WORD_ENDINGS.SUPERLATIVE, '');
      } else if (this.WORD_ENDINGS.COMPARATIVE.test(normalized)) {
        normalized = normalized.replace(this.WORD_ENDINGS.COMPARATIVE, '');
      } else if (this.WORD_ENDINGS.GERUND.test(normalized)) {
        normalized = this.normalizeGerund(normalized);
      } else if (this.WORD_ENDINGS.PAST_TENSE.test(normalized)) {
        normalized = this.normalizePastTense(normalized);
      } else if (this.WORD_ENDINGS.PLURAL.test(normalized)) {
        normalized = this.normalizePlural(normalized);
      }
    }

    return normalized;
  }

  private isNormalizationException(word: string): boolean {
    // List of words that shouldn't be normalized
    const exceptions = new Set([
      'this', 'his', 'is', 'was', 'has', 'does', 'series', 'species'
    ]);
    return exceptions.has(word.toLowerCase());
  }

  private normalizeGerund(word: string): string {
    // Handle doubled consonants: running -> run
    if (/[^aeiou]{2}ing$/.test(word)) {
      return word.slice(0, -4);
    }
    // Handle 'y' + 'ing': flying -> fly
    if (/ying$/.test(word)) {
      return word.slice(0, -4) + 'y';
    }
    // Regular cases
    return word.slice(0, -3);
  }

  private normalizePastTense(word: string): string {
    // Handle doubled consonants: stopped -> stop
    if (/[^aeiou]{2}ed$/.test(word)) {
      return word.slice(0, -3);
    }
    // Handle 'y' + 'ed': tried -> try
    if (/ied$/.test(word)) {
      return word.slice(0, -3) + 'y';
    }
    // Regular cases
    return word.slice(0, -2);
  }

  private normalizePlural(word: string): string {
    // Handle 'ies' plurals: flies -> fly
    if (/ies$/.test(word)) {
      return word.slice(0, -3) + 'y';
    }
    // Handle 'es' plurals: boxes -> box
    if (/[sxz]es$|[^aeiou]hes$/.test(word)) {
      return word.slice(0, -2);
    }
    // Regular plurals
    return word.slice(0, -1);
  }

  private reconstructQuery(tokens: QueryToken[], phrases: string[]): string {
    const tokenPart = tokens
      .map(token => token.value)
      .join(' ');

    return [...phrases, tokenPart]
      .filter(part => part.length > 0)
      .join(' ')
      .trim()
      .replace(/\s+/g, ' ');
  }
}