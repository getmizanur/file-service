const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const PaginationHelper = require(globalThis.applicationPath('/application/helper/pagination-helper'));

describe('PaginationHelper', () => {
  let helper;

  beforeEach(() => {
    helper = new PaginationHelper();
  });

  describe('render()', () => {
    it('returns empty string when pagination is null', () => {
      expect(helper.render(null, 'my-drive', null, null, 'list')).toBe('');
    });

    it('returns empty string when pagination is undefined', () => {
      expect(helper.render(undefined)).toBe('');
    });

    it('returns empty string when totalPages <= 1', () => {
      const pagination = { page: 1, totalFiles: 5, totalPages: 1, from: 1, to: 5 };
      expect(helper.render(pagination, 'my-drive', null, null, 'list')).toBe('');
    });

    it('returns HTML with pagination-nav class for valid pagination', () => {
      const pagination = { page: 1, totalFiles: 50, totalPages: 5, from: 1, to: 10 };
      const html = helper.render(pagination, 'my-drive', null, null, 'list');
      expect(html).toContain('pagination-nav');
      expect(html).toContain('pagination-link');
    });

    it('disables previous button on page 1', () => {
      const pagination = { page: 1, totalFiles: 50, totalPages: 5, from: 1, to: 10 };
      const html = helper.render(pagination, 'my-drive', null, null, 'list');
      expect(html).toContain('pagination-prev disabled');
    });

    it('enables previous button on page > 1', () => {
      const pagination = { page: 2, totalFiles: 50, totalPages: 5, from: 11, to: 20 };
      const html = helper.render(pagination, 'my-drive', null, null, 'list');
      expect(html).toContain('pagination-prev');
      expect(html).not.toMatch(/pagination-prev disabled/);
    });

    it('disables next button on last page', () => {
      const pagination = { page: 5, totalFiles: 50, totalPages: 5, from: 41, to: 50 };
      const html = helper.render(pagination, 'my-drive', null, null, 'list');
      expect(html).toContain('pagination-next disabled');
    });

    it('enables next button when not on last page', () => {
      const pagination = { page: 1, totalFiles: 50, totalPages: 5, from: 1, to: 10 };
      const html = helper.render(pagination, 'my-drive', null, null, 'list');
      expect(html).toContain('pagination-next');
      expect(html).not.toMatch(/pagination-next disabled/);
    });

    it('shows pagination info with correct from-to of total', () => {
      const pagination = { page: 2, totalFiles: 50, totalPages: 5, from: 11, to: 20 };
      const html = helper.render(pagination, 'search', null, 'cake', 'list');
      expect(html).toContain('Showing 11');
      expect(html).toContain('20');
      expect(html).toContain('50 results');
    });

    it('includes search query in pagination links', () => {
      const pagination = { page: 1, totalFiles: 50, totalPages: 5, from: 1, to: 10 };
      const html = helper.render(pagination, 'search', null, 'cake', 'list');
      expect(html).toContain('q=cake');
    });

    it('includes folder id in pagination links', () => {
      const pagination = { page: 1, totalFiles: 50, totalPages: 5, from: 1, to: 10 };
      const html = helper.render(pagination, 'my-drive', 'folder-123', null, 'list');
      expect(html).toContain('id=folder-123');
    });

    it('renders ellipsis when totalPages > 7', () => {
      const pagination = { page: 10, totalFiles: 200, totalPages: 20, from: 91, to: 100 };
      const html = helper.render(pagination, 'my-drive', null, null, 'list');
      expect(html).toContain('pagination-ellipsis');
      expect(html).toContain('&hellip;');
    });
  });

  describe('buildUrl parameter branches (lines 28-31)', () => {
    const pagination = { page: 2, totalFiles: 50, totalPages: 5, from: 11, to: 20 };

    it('should not include view param when viewMode is falsy', () => {
      const html = helper.render(pagination, null, 'folder-1', 'query', 'list', 'name');
      expect(html).not.toContain('view=');
    });

    it('should include layout param when layoutMode is provided', () => {
      const html = helper.render(pagination, 'my-drive', null, null, 'grid');
      expect(html).toContain('layout=grid');
    });

    it('should not include layout param when layoutMode is falsy', () => {
      const html = helper.render(pagination, 'my-drive', null, null, null);
      expect(html).not.toContain('layout=');
    });

    it('should include sort param when sortMode is not "name"', () => {
      const html = helper.render(pagination, 'my-drive', null, null, 'list', 'date');
      expect(html).toContain('sort=date');
    });

    it('should not include sort param when sortMode is "name"', () => {
      const html = helper.render(pagination, 'my-drive', null, null, 'list', 'name');
      expect(html).not.toContain('sort=');
    });

    it('should not include sort param when sortMode is falsy', () => {
      const html = helper.render(pagination, 'my-drive', null, null, 'list', null);
      expect(html).not.toContain('sort=');
    });

    it('should include all params when all are provided', () => {
      const html = helper.render(pagination, 'search', 'folder-1', 'cake', 'grid', 'date');
      expect(html).toContain('id=folder-1');
      expect(html).toContain('view=search');
      expect(html).toContain('q=cake');
      expect(html).toContain('layout=grid');
      expect(html).toContain('sort=date');
    });
  });

  describe('_buildPageWindow()', () => {
    it('returns all pages when total <= 7', () => {
      expect(helper._buildPageWindow(1, 1)).toEqual([1]);
      expect(helper._buildPageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
      expect(helper._buildPageWindow(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('returns correct window when current=1 and total > 7', () => {
      const pages = helper._buildPageWindow(1, 10);
      expect(pages[0]).toBe(1);
      expect(pages).toContain('...');
      expect(pages[pages.length - 1]).toBe(10);
    });

    it('returns correct window for middle page', () => {
      const pages = helper._buildPageWindow(5, 10);
      expect(pages[0]).toBe(1);
      expect(pages[pages.length - 1]).toBe(10);
      expect(pages).toContain(5);
      // Should have ellipsis on both sides
      const ellipsisCount = pages.filter(p => p === '...').length;
      expect(ellipsisCount).toBe(2);
    });

    it('returns correct window when current=total and total > 7', () => {
      const pages = helper._buildPageWindow(10, 10);
      expect(pages[0]).toBe(1);
      expect(pages).toContain('...');
      expect(pages[pages.length - 1]).toBe(10);
      expect(pages).toContain(8);
      expect(pages).toContain(9);
    });

    it('always includes first and last page', () => {
      for (let current = 1; current <= 15; current++) {
        const pages = helper._buildPageWindow(current, 15);
        expect(pages[0]).toBe(1);
        expect(pages[pages.length - 1]).toBe(15);
      }
    });
  });
});
