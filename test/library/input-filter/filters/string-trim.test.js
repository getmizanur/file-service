const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
const StringTrim = require(path.join(projectRoot, 'library/input-filter/filters/string-trim'));

describe('StringTrim', () => {
  let filter;

  beforeEach(() => {
    filter = new StringTrim();
  });

  describe('filter', () => {
    it('should trim whitespace from both ends', () => {
      expect(filter.filter('  hello  ')).toBe('hello');
    });

    it('should trim tabs and newlines', () => {
      expect(filter.filter('\t\nhello\n\t')).toBe('hello');
    });

    it('should return empty string for whitespace-only input', () => {
      expect(filter.filter('   ')).toBe('');
    });

    it('should not modify strings without leading/trailing whitespace', () => {
      expect(filter.filter('hello')).toBe('hello');
    });

    it('should convert non-string values to string before trimming', () => {
      expect(filter.filter(123)).toBe('123');
      expect(filter.filter(null)).toBe('null');
      expect(filter.filter(undefined)).toBe('undefined');
      expect(filter.filter(true)).toBe('true');
    });

    it('should handle empty string', () => {
      expect(filter.filter('')).toBe('');
    });
  });

});
