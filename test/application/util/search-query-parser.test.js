const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const SearchQueryParser = require(globalThis.applicationPath('/application/util/search-query-parser'));

describe('SearchQueryParser', () => {

  describe('parse() with null/undefined/empty/non-string input', () => {
    it('returns defaults for null', () => {
      const result = SearchQueryParser.parse(null);
      expect(result).toEqual({
        searchTerm: '',
        filetype: null,
        intitle: null,
        allintitle: null,
        author: null
      });
    });

    it('returns defaults for undefined', () => {
      const result = SearchQueryParser.parse(undefined);
      expect(result).toEqual({
        searchTerm: '',
        filetype: null,
        intitle: null,
        allintitle: null,
        author: null
      });
    });

    it('returns defaults for empty string', () => {
      const result = SearchQueryParser.parse('');
      expect(result).toEqual({
        searchTerm: '',
        filetype: null,
        intitle: null,
        allintitle: null,
        author: null
      });
    });

    it('returns defaults for non-string input (number)', () => {
      const result = SearchQueryParser.parse(123);
      expect(result).toEqual({
        searchTerm: '',
        filetype: null,
        intitle: null,
        allintitle: null,
        author: null
      });
    });

    it('returns defaults for non-string input (object)', () => {
      const result = SearchQueryParser.parse({});
      expect(result).toEqual({
        searchTerm: '',
        filetype: null,
        intitle: null,
        allintitle: null,
        author: null
      });
    });
  });

  describe('parse() with plain search term', () => {
    it('parses a simple word', () => {
      const result = SearchQueryParser.parse('cake');
      expect(result.searchTerm).toBe('cake');
      expect(result.filetype).toBeNull();
      expect(result.intitle).toBeNull();
      expect(result.allintitle).toBeNull();
      expect(result.author).toBeNull();
    });
  });

  describe('parse() with filetype operator', () => {
    it('extracts filetype and remaining search term', () => {
      const result = SearchQueryParser.parse('filetype:pdf cake');
      expect(result.filetype).toBe('pdf');
      expect(result.searchTerm).toBe('cake');
    });

    it('lowercases filetype value', () => {
      const result = SearchQueryParser.parse('filetype:PDF');
      expect(result.filetype).toBe('pdf');
    });
  });

  describe('parse() with author operator', () => {
    it('extracts single-word author', () => {
      const result = SearchQueryParser.parse('author:john some text');
      expect(result.author).toBe('john');
      expect(result.searchTerm).toBe('some text');
    });

    it('extracts quoted multi-word author', () => {
      const result = SearchQueryParser.parse('author:"DP admin" text');
      expect(result.author).toBe('DP admin');
      expect(result.searchTerm).toBe('text');
    });
  });

  describe('parse() with intitle operator', () => {
    it('extracts single-word intitle', () => {
      const result = SearchQueryParser.parse('intitle:elections');
      expect(result.intitle).toBe('elections');
      expect(result.searchTerm).toBe('');
    });

    it('extracts quoted phrase intitle', () => {
      const result = SearchQueryParser.parse('intitle:"us elections"');
      expect(result.intitle).toBe('us elections');
    });
  });

  describe('parse() with allintitle operator', () => {
    it('extracts multiple terms as array', () => {
      const result = SearchQueryParser.parse('allintitle:daily logo favicon');
      expect(result.allintitle).toEqual(['daily', 'logo', 'favicon']);
      expect(result.searchTerm).toBe('');
    });

    it('handles allintitle with only whitespace after colon (line 51 false branch)', () => {
      const result = SearchQueryParser.parse('allintitle:   ');
      expect(result.allintitle).toBeNull();
      expect(result.searchTerm).toBe('');
    });

    it('allintitle takes precedence over intitle', () => {
      // allintitle consumes the rest of the string, so intitle won't be parsed
      const result = SearchQueryParser.parse('allintitle:daily logo');
      expect(result.allintitle).toEqual(['daily', 'logo']);
      expect(result.intitle).toBeNull();
    });
  });

  describe('parse() with combined operators', () => {
    it('extracts filetype, author, and search term together', () => {
      const result = SearchQueryParser.parse('filetype:pdf author:john cake');
      expect(result.filetype).toBe('pdf');
      expect(result.author).toBe('john');
      expect(result.searchTerm).toBe('cake');
      expect(result.intitle).toBeNull();
      expect(result.allintitle).toBeNull();
    });
  });
});
