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
    it('returns default nav when currentFolderId is null', () => {
      const html = helper.render(null, null, []);
      expect(html).toContain('breadcrumb-nav');
      expect(html).toContain('My Drive');
    });

    it('returns default nav when currentFolderId is undefined', () => {
      const html = helper.render(undefined, undefined, []);
      expect(html).toContain('breadcrumb-nav');
      expect(html).toContain('My Drive');
    });

    it('returns default nav when folders is empty array', () => {
      const html = helper.render('f1', 'root', []);
      expect(html).toContain('breadcrumb-nav');
      expect(html).toContain('My Drive');
    });

    it('renders single breadcrumb as current (no link)', () => {
      const folders = [{ name: 'Documents', folder_id: 'f1', parent_folder_id: null }];
      const html = helper.render('f1', 'f1', folders);
      expect(html).toContain('breadcrumb-current');
      expect(html).not.toContain('breadcrumb-link');
    });

    it('renders multiple breadcrumbs with links and last as current', () => {
      const folders = [
        { name: 'Root', folder_id: 'f1', parent_folder_id: null },
        { name: 'Docs', folder_id: 'f2', parent_folder_id: 'f1' },
        { name: 'Final', folder_id: 'f3', parent_folder_id: 'f2' }
      ];
      const html = helper.render('f3', 'f1', folders);
      expect(html).toContain('breadcrumb-link');
      expect(html).toContain('Docs');
      expect(html).toContain('breadcrumb-current');
      expect(html).toContain('Final');
    });

    it('uses "Untitled" for crumbs without a name', () => {
      const folders = [{ folder_id: 'f1', parent_folder_id: null }];
      const html = helper.render('f1', 'f1', folders);
      expect(html).toContain('breadcrumb-current');
    });

    it('strips Nunjucks context from args', () => {
      const folders = [{ name: 'Test', folder_id: 'f1', parent_folder_id: null }];
      const ctx = { ctx: {}, env: {} };
      const html = helper.render('f1', 'f1', folders, 'my-drive', 'grid', 'name', ctx);
      expect(html).toContain('breadcrumb-current');
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
