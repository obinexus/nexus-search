import { SearchOptions, IndexConfig } from "@/types";
import { validateSearchOptions, validateIndexConfig, validateDocument } from "@/utils";

describe('ValidationUtils', () => {
  describe('validateSearchOptions', () => {
    test('should accept valid options', () => {
      const options: SearchOptions = {
        fuzzy: true,
        maxResults: 10,
        threshold: 0.5,
        fields: ['title', 'content']
      };
      expect(() => validateSearchOptions(options)).not.toThrow();
    });

    test('should reject invalid maxResults', () => {
      const options: SearchOptions = { maxResults: -1 };
      expect(() => validateSearchOptions(options)).toThrow();
    });

    test('should reject invalid threshold', () => {
      const options: SearchOptions = { threshold: 1.5 };
      expect(() => validateSearchOptions(options)).toThrow();
    });

    test('should reject invalid fields type', () => {
      const options = { fields: 'invalid' } as any;
      expect(() => validateSearchOptions(options)).toThrow();
    });

    test('should handle empty options', () => {
      expect(() => validateSearchOptions({})).not.toThrow();
    });
  });

  describe('validateIndexConfig', () => {
    test('should accept valid config', () => {
      const config: IndexConfig = {
        name: 'test',
        version: 1,
        fields: ['title']
      };
      expect(() => validateIndexConfig(config)).not.toThrow();
    });

    test('should reject empty name', () => {
      const config: IndexConfig = {
        name: '',
        version: 1,
        fields: ['title']
      };
      expect(() => validateIndexConfig(config)).toThrow();
    });

    test('should reject invalid version', () => {
      const config: IndexConfig = {
        name: 'test',
        version: -1,
        fields: ['title']
      };
      expect(() => validateIndexConfig(config)).toThrow();
    });

    test('should reject empty fields array', () => {
      const config: IndexConfig = {
        name: 'test',
        version: 1,
        fields: []
      };
      expect(() => validateIndexConfig(config)).toThrow();
    });

    test('should validate options if provided', () => {
      const config: IndexConfig = {
        name: 'test',
        version: 1,
        fields: ['title'],
        options: {
          caseSensitive: true,
          stemming: true
        }
      };
      expect(() => validateIndexConfig(config)).not.toThrow();
    });
  });

  describe('validateDocument', () => {
    test('should validate document with all required fields', () => {
      const doc = { title: 'Test', content: 'Content' };
      expect(validateDocument(doc, ['title', 'content'])).toBe(true);
    });

    test('should reject document with missing fields', () => {
      const doc = { title: 'Test' };
      expect(validateDocument(doc, ['title', 'content'])).toBe(false);
    });

    test('should validate nested fields', () => {
      const doc = { metadata: { title: 'Test' } };
      expect(validateDocument(doc, ['metadata.title'])).toBe(true);
    });

    test('should handle undefined values', () => {
      const doc = { title: undefined };
      expect(validateDocument(doc, ['title'])).toBe(false);
    });

    test('should handle null values', () => {
      const doc = { title: null };
      expect(validateDocument(doc, ['title'])).toBe(false);
    });
  });
});