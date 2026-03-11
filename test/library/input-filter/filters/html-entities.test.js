const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
const HtmlEntities = require(path.join(projectRoot, 'library/input-filter/filters/html-entities'));

describe('HtmlEntities', () => {
  let filter;

  beforeEach(() => {
    filter = new HtmlEntities();
  });

  describe('filter', () => {
    it('should encode HTML special characters', () => {
      const result = filter.filter('<script>alert("xss")</script>');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&quot;');
    });

    it('should encode ampersand', () => {
      const result = filter.filter('foo & bar');
      expect(result).toContain('&amp;');
    });

    it('should handle empty string', () => {
      expect(filter.filter('')).toBe('');
    });

    it('should handle null by converting to empty string', () => {
      expect(filter.filter(null)).toBe('');
    });

    it('should handle string with no special characters', () => {
      expect(filter.filter('hello world')).toBe('hello world');
    });
  });

  describe('htmlEntities', () => {
    it('should encode with ENT_QUOTES', () => {
      const result = filter.htmlEntities("it's a \"test\"", 'ENT_QUOTES');
      expect(result).toContain('&#039;');
      expect(result).toContain('&quot;');
    });

    it('should not double encode by default when entities already present', () => {
      const result = filter.htmlEntities('&amp; already encoded', undefined, undefined, false);
      expect(result).toBe('&amp; already encoded');
    });

    it('should double encode when doubleEncode is true', () => {
      const result = filter.htmlEntities('&amp; test', undefined, undefined, true);
      expect(result).toContain('&amp;amp;');
    });
  });

  describe('getHtmlTranslationTable', () => {
    it('should return HTML_SPECIALCHARS table by default', () => {
      const table = filter.getHtmlTranslationTable(0, 2);
      expect(table['&']).toBe('&amp;');
      expect(table['<']).toBe('&lt;');
      expect(table['>']).toBe('&gt;');
      expect(table['"']).toBe('&quot;');
    });

    it('should return HTML_ENTITIES table', () => {
      const table = filter.getHtmlTranslationTable(1, 2);
      expect(table['&']).toBe('&amp;');
      expect(table['\u00A9']).toBe('&copy;'); // copyright symbol
    });

    it('should include single quote for ENT_QUOTES', () => {
      const table = filter.getHtmlTranslationTable(0, 3);
      expect(table["'"]).toBe('&#39;');
    });

    it('should not include quotes for ENT_NOQUOTES', () => {
      const table = filter.getHtmlTranslationTable(0, 0);
      expect(table['"']).toBeUndefined();
    });

    it('should throw for unsupported table', () => {
      expect(() => filter.getHtmlTranslationTable('UNSUPPORTED', 2)).toThrow('Table: UNSUPPORTED not supported');
    });
  });

  describe('htmlEntities - hashMap falsy (line 153)', () => {
    it('should return false when getHtmlTranslationTable returns falsy', () => {
      // Override getHtmlTranslationTable to return null
      const original = filter.getHtmlTranslationTable;
      filter.getHtmlTranslationTable = () => null;
      expect(filter.htmlEntities('test')).toBe(false);
      filter.getHtmlTranslationTable = original;
    });
  });

});
