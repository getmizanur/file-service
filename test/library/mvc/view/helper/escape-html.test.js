const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const EscapeHtml = require(path.join(projectRoot, 'library/mvc/view/helper/escape-html'));

describe('EscapeHtml', () => {
  let helper;

  beforeEach(() => {
    helper = new EscapeHtml();
  });

  describe('escape', () => {
    it('should return empty string for null/undefined', () => {
      expect(helper.escape(null)).toBe('');
      expect(helper.escape(undefined)).toBe('');
    });

    it('should escape ampersands', () => {
      expect(helper.escape('a&b')).toBe('a&amp;b');
    });

    it('should escape angle brackets', () => {
      expect(helper.escape('<div>')).toBe('&lt;div&gt;');
    });

    it('should escape quotes', () => {
      expect(helper.escape('"test"')).toBe('&quot;test&quot;');
      expect(helper.escape("'test'")).toBe('&#x27;test&#x27;');
    });

    it('should escape forward slashes', () => {
      expect(helper.escape('a/b')).toBe('a&#x2F;b');
    });

    it('should convert non-strings', () => {
      expect(helper.escape(42)).toBe('42');
    });
  });

  describe('render', () => {
    it('should escape via render method', () => {
      expect(helper.render('<script>')).toContain('&lt;script&gt;');
    });

    it('should handle nunjucks context', () => {
      const ctx = { ctx: {} };
      const result = helper.render('<b>', ctx);
      expect(result).toContain('&lt;b&gt;');
    });
  });
});
