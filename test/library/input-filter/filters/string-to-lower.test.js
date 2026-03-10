const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const StringToLower = require(path.join(projectRoot, 'library/input-filter/filters/string-to-lower'));

describe('StringToLower Filter', () => {

  let filter;

  beforeEach(() => {
    filter = new StringToLower();
  });

  describe('filter()', () => {
    it('should convert a string to lowercase', () => {
      expect(filter.filter('HELLO')).toBe('hello');
    });

    it('should handle mixed case', () => {
      expect(filter.filter('Hello World')).toBe('hello world');
    });

    it('should return already lowercase string unchanged', () => {
      expect(filter.filter('hello')).toBe('hello');
    });

    it('should handle empty string', () => {
      expect(filter.filter('')).toBe('');
    });

    it('should convert number to string then lowercase', () => {
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
      expect(filter.filter(false)).toBe('false');
    });

    it('should convert object to string', () => {
      expect(filter.filter({})).toBe('[object object]');
    });
  });
});
