const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const BreadcrumbHelper = require(globalThis.applicationPath('/application/helper/breadcrumb-helper'));

describe('BreadcrumbHelper', () => {
  let helper;

  beforeEach(() => {
    helper = new BreadcrumbHelper();
  });

  it('can be instantiated', () => {
    expect(helper).toBeInstanceOf(BreadcrumbHelper);
  });

  describe('render()', () => {
    it('returns default nav when breadcrumbs is null', () => {
      const html = helper.render(null);
      expect(html).toContain('breadcrumb-nav');
      expect(html).toContain('My Drive');
    });

    it('returns default nav when breadcrumbs is undefined', () => {
      const html = helper.render(undefined);
      expect(html).toContain('breadcrumb-nav');
      expect(html).toContain('My Drive');
    });

    it('returns default nav when breadcrumbs is empty array', () => {
      const html = helper.render([]);
      expect(html).toContain('breadcrumb-nav');
      expect(html).toContain('My Drive');
    });

    it('renders single breadcrumb as current (no link)', () => {
      const crumbs = [{ name: 'Documents', folder_id: 'f1' }];
      const html = helper.render(crumbs);
      expect(html).toContain('breadcrumb-current');
      expect(html).toContain('Documents');
      expect(html).not.toContain('breadcrumb-link');
    });

    it('renders multiple breadcrumbs with links and last as current', () => {
      const crumbs = [
        { name: 'Root', folder_id: 'f1' },
        { name: 'Docs', folder_id: 'f2' },
        { name: 'Final', folder_id: 'f3' }
      ];
      const html = helper.render(crumbs);
      expect(html).toContain('breadcrumb-link');
      expect(html).toContain('Root');
      expect(html).toContain('Docs');
      expect(html).toContain('breadcrumb-current');
      expect(html).toContain('Final');
    });

    it('uses "Untitled" for crumbs without a name', () => {
      const crumbs = [{ folder_id: 'f1' }];
      const html = helper.render(crumbs);
      expect(html).toContain('Untitled');
    });

    it('strips Nunjucks context from args', () => {
      const crumbs = [{ name: 'Test', folder_id: 'f1' }];
      const ctx = { ctx: {}, env: {} };
      const html = helper.render(crumbs, 'my-drive', 'grid', 'name', ctx);
      expect(html).toContain('Test');
    });
  });

  describe('_escape()', () => {
    it('escapes ampersand', () => {
      expect(helper._escape('A & B')).toBe('A &amp; B');
    });

    it('escapes angle brackets', () => {
      expect(helper._escape('<div>')).toBe('&lt;div&gt;');
    });

    it('escapes double quotes', () => {
      expect(helper._escape('"hello"')).toBe('&quot;hello&quot;');
    });

    it('handles empty string', () => {
      expect(helper._escape('')).toBe('');
    });

    it('handles string with no special chars', () => {
      expect(helper._escape('hello world')).toBe('hello world');
    });
  });
});
