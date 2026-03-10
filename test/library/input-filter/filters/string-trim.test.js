const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const StringTrim = require(path.join(projectRoot, 'library/input-filter/filters/string-trim'));

describe('StringTrim Filter', () => {

  let filter;

  beforeEach(() => {
    filter = new StringTrim();
  });

  describe('filter()', () => {
    it('should trim whitespace from string', () => {
      expect(filter.filter('  hello  ')).toBe('hello');
    });

    it('should handle already trimmed string', () => {
      expect(filter.filter('hello')).toBe('hello');
    });

    it('should handle empty string', () => {
      expect(filter.filter('')).toBe('');
    });

    it('should trim tabs and newlines', () => {
      expect(filter.filter('\t\nhello\n\t')).toBe('hello');
    });

    it('should convert non-string to string then trim (line 14)', () => {
      expect(filter.filter(123)).toBe('123');
    });

    it('should convert null to string "null"', () => {
      expect(filter.filter(null)).toBe('null');
    });

    it('should convert undefined to string "undefined"', () => {
      expect(filter.filter(undefined)).toBe('undefined');
    });

    it('should convert boolean to string', () => {
      expect(filter.filter(true)).toBe('true');
    });
  });
});
