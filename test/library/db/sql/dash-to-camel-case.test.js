const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const DashToCamelCase = require(path.join(projectRoot, 'library/input-filter/filters/dash-to-camel-case'));

describe('DashToCamelCase', () => {
  let filter;

  beforeEach(() => {
    filter = new DashToCamelCase();
  });

  describe('filter', () => {
    it('should convert dash-separated string to camelCase', () => {
      expect(filter.filter('camel-case')).toBe('camelCase');
    });

    it('should convert multiple dashes', () => {
      expect(filter.filter('my-class-name')).toBe('myClassName');
    });

    it('should handle single word without dashes', () => {
      expect(filter.filter('hello')).toBe('hello');
    });

    it('should handle empty string', () => {
      expect(filter.filter('')).toBe('');
    });

    it('should convert non-string values to string first', () => {
      expect(filter.filter(123)).toBe('123');
      expect(filter.filter(null)).toBe('null');
      expect(filter.filter(undefined)).toBe('undefined');
      expect(filter.filter(true)).toBe('true');
    });

    it('should handle dashes at the beginning', () => {
      expect(filter.filter('-leading')).toBe('Leading');
    });

    it('should handle consecutive dashes', () => {
      // dash followed by non-letter stays as-is
      expect(filter.filter('a--b')).toBe('a-B');
    });

    it('should not convert uppercase letters after dash', () => {
      // The regex only matches lowercase letters after dash
      expect(filter.filter('my-Class')).toBe('my-Class');
    });

    it('should handle trailing dash', () => {
      expect(filter.filter('trailing-')).toBe('trailing-');
    });

    it('should convert html-parser correctly', () => {
      expect(filter.filter('html-parser')).toBe('htmlParser');
    });
  });
});
