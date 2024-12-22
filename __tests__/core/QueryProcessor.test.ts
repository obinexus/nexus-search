import { QueryProcessor } from "@/core";


describe('QueryProcessor', () => {
  let queryProcessor: QueryProcessor;

  beforeEach(() => {
    queryProcessor = new QueryProcessor();
  });

  describe('Query Processing', () => {
    test('should handle basic query processing', () => {
      const result = queryProcessor.process('test query');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    test('should remove stop words', () => {
      const result = queryProcessor.process('the test and query');
      expect(result).not.toContain('the');
      expect(result).not.toContain('and');
    });

    test('should handle empty query', () => {
      const result = queryProcessor.process('');
      expect(result).toBe('');
    });

    test('should normalize query terms', () => {
      const result = queryProcessor.process('Testing QUERIES');
      expect(result.toLowerCase()).toBe(result);
    });

    test('should handle operators', () => {
      const result = queryProcessor.process('+required -excluded');
      expect(result).toContain('+required');
      expect(result).toContain('-excluded');
    });

    test('should process modifiers', () => {
      const result = queryProcessor.process('field:value');
      expect(result).toContain('field:value');
    });
  });

  describe('Token Classification', () => {
    test('should classify operator tokens', () => {
      const input = '+required -excluded';
      const result = queryProcessor.process(input);
      expect(result).toContain('+required');
      expect(result).toContain('-excluded');
    });

    test('should classify modifier tokens', () => {
      const input = 'title:test content:example';
      const result = queryProcessor.process(input);
      expect(result).toContain('title:test');
      expect(result).toContain('content:example');
    });

    test('should classify regular terms', () => {
      const input = 'regular search terms';
      const result = queryProcessor.process(input);
      expect(result).toContain('regular');
      expect(result).toContain('search');
      expect(result).toContain('terms');
    });
  });

  describe('Token Processing', () => {
    test('should handle stemming', () => {
      const result = queryProcessor.process('running tests testing');
      expect(result).not.toContain('running');
      expect(result).toContain('run');
      expect(result).toContain('test');
    });

    test('should handle multiple spaces', () => {
      const result = queryProcessor.process('test    multiple    spaces');
      expect(result.split(' ').filter(Boolean).length).toBe(3);
    });

    test('should preserve quotes', () => {
      const result = queryProcessor.process('"exact phrase"');
      expect(result).toContain('"exact phrase"');
    });
  });

  describe('Error Handling', () => {
    test('should handle null input', () => {
      const result = queryProcessor.process(null as any);
      expect(result).toBe('');
    });

    test('should handle undefined input', () => {
      const result = queryProcessor.process(undefined as any);
      expect(result).toBe('');
    });

    test('should handle non-string input', () => {
      const result = queryProcessor.process(123 as any);
      expect(result).toBe('123');
    });
  });

  describe('Special Cases', () => {
    test('should handle special characters', () => {
      const result = queryProcessor.process('test@email.com');
      expect(result).toContain('test@email.com');
    });

    test('should handle numbers', () => {
      const result = queryProcessor.process('test123');
      expect(result).toContain('test123');
    });

    test('should handle mixed case with operators', () => {
      const result = queryProcessor.process('+TEST -EXCLUDE');
      expect(result.toLowerCase()).toContain('test');
      expect(result.toLowerCase()).toContain('exclude');
    });
  });
});