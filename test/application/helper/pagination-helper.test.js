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
      expect(html).toContain('q=cake');
      expect(html).toContain('layout=grid');
      expect(html).toContain('sort=date');
    });

    it('should use route path from VIEW_MODE_ROUTES instead of view query param', () => {
      const html = helper.render(pagination, 'search', null, 'cake', 'list');
      expect(html).toContain('/search');
      expect(html).not.toContain('view=');
    });
  });

  describe('URL routing', () => {
    const pagination = { page: 2, totalFiles: 50, totalPages: 5, from: 11, to: 20 };

    it('uses /my-drive route for my-drive viewMode', () => {
      const html = helper.render(pagination, 'my-drive', null, null, 'list');
      expect(html).toContain('href="/my-drive');
    });

    it('uses /search route for search viewMode', () => {
      const html = helper.render(pagination, 'search', null, 'cake', 'list');
      expect(html).toContain('href="/search');
    });

    it('uses /recent route for recent viewMode', () => {
      const html = helper.render(pagination, 'recent', null, null, 'list');
      expect(html).toContain('href="/recent');
    });

    it('uses /starred route for starred viewMode', () => {
      const html = helper.render(pagination, 'starred', null, null, 'list');
      expect(html).toContain('href="/starred');
    });

    it('uses /shared route for shared-with-me viewMode', () => {
      const html = helper.render(pagination, 'shared-with-me', null, null, 'list');
      expect(html).toContain('href="/shared');
    });

    it('uses /trash route for trash viewMode', () => {
      const html = helper.render(pagination, 'trash', null, null, 'list');
      expect(html).toContain('href="/trash');
    });

    it('falls back to adminHome route for unknown viewMode', () => {
      const html = helper.render(pagination, 'unknown-mode', null, null, 'list');
      // adminHome route is "/" so links start with "/?..."
      expect(html).toContain('href="/?');
    });

    it('does not include page param for page 1', () => {
      const pag = { page: 2, totalFiles: 50, totalPages: 5, from: 11, to: 20 };
      const html = helper.render(pag, 'my-drive', null, null, 'list');
      // Page 1 link should not have page= param
      const page1Match = html.match(/href="([^"]*)"[^>]*class="pagination-link">1</);
      expect(page1Match).not.toBeNull();
      expect(page1Match[1]).not.toContain('page=');
    });

    it('includes page param for pages > 1', () => {
      const pag = { page: 1, totalFiles: 50, totalPages: 5, from: 1, to: 10 };
      const html = helper.render(pag, 'my-drive', null, null, 'list');
      // Page 3 link should have page=3
      expect(html).toContain('page=3');
    });

    it('previous button links to page-1', () => {
      const pag = { page: 3, totalFiles: 50, totalPages: 5, from: 21, to: 30 };
      const html = helper.render(pag, 'my-drive', null, null, 'list');
      const prevMatch = html.match(/href="([^"]*)"[^>]*class="pagination-link pagination-prev"/);
      expect(prevMatch).not.toBeNull();
      expect(prevMatch[1]).toContain('page=2');
    });

    it('next button links to page+1', () => {
      const pag = { page: 3, totalFiles: 50, totalPages: 5, from: 21, to: 30 };
      const html = helper.render(pag, 'my-drive', null, null, 'list');
      const nextMatch = html.match(/href="([^"]*)"[^>]*class="pagination-link pagination-next"/);
      expect(nextMatch).not.toBeNull();
      expect(nextMatch[1]).toContain('page=4');
    });

    it('active page is rendered as span, not a link', () => {
      const pag = { page: 3, totalFiles: 50, totalPages: 5, from: 21, to: 30 };
      const html = helper.render(pag, 'my-drive', null, null, 'list');
      expect(html).toContain('<span class="pagination-link active">3</span>');
    });
  });

  describe('my-drive view mode', () => {
    it('generates /my-drive URLs with folder id', () => {
      const pagination = { page: 1, totalFiles: 30, totalPages: 3, from: 1, to: 10 };
      const html = helper.render(pagination, 'my-drive', 'folder-abc', null, 'list');
      expect(html).toContain('href="/my-drive?id=folder-abc');
      expect(html).not.toContain('page=1');
    });

    it('generates /my-drive URLs with page param on page 2', () => {
      const pagination = { page: 2, totalFiles: 30, totalPages: 3, from: 11, to: 20 };
      const html = helper.render(pagination, 'my-drive', 'folder-abc', null, 'list');
      expect(html).toContain('href="/my-drive?id=folder-abc&layout=list&page=3"');
    });

    it('preserves grid layout in my-drive pagination links', () => {
      const pagination = { page: 1, totalFiles: 30, totalPages: 3, from: 1, to: 10 };
      const html = helper.render(pagination, 'my-drive', 'folder-abc', null, 'grid');
      expect(html).toContain('layout=grid');
    });

    it('preserves sort param in my-drive pagination links', () => {
      const pagination = { page: 1, totalFiles: 30, totalPages: 3, from: 1, to: 10 };
      const html = helper.render(pagination, 'my-drive', 'folder-abc', null, 'list', 'date');
      expect(html).toContain('sort=date');
    });

    it('does not include sort param when sortMode is default "name"', () => {
      const pagination = { page: 1, totalFiles: 30, totalPages: 3, from: 1, to: 10 };
      const html = helper.render(pagination, 'my-drive', 'folder-abc', null, 'list', 'name');
      expect(html).not.toContain('sort=');
    });

    it('works without folder id (root my-drive)', () => {
      const pagination = { page: 1, totalFiles: 30, totalPages: 3, from: 1, to: 10 };
      const html = helper.render(pagination, 'my-drive', null, null, 'list');
      expect(html).toContain('href="/my-drive');
      expect(html).not.toContain('id=');
    });
  });

  describe('search view mode', () => {
    it('generates /search URLs with search query', () => {
      const pagination = { page: 1, totalFiles: 30, totalPages: 3, from: 1, to: 10 };
      const html = helper.render(pagination, 'search', null, 'annual report', 'list');
      expect(html).toContain('href="/search?q=annual%20report');
    });

    it('generates /search URLs with page param on page 2', () => {
      const pagination = { page: 2, totalFiles: 30, totalPages: 3, from: 11, to: 20 };
      const html = helper.render(pagination, 'search', null, 'cake', 'list');
      expect(html).toContain('href="/search?q=cake&layout=list&page=3"');
    });

    it('includes folder id and search query together', () => {
      const pagination = { page: 1, totalFiles: 30, totalPages: 3, from: 1, to: 10 };
      const html = helper.render(pagination, 'search', 'folder-xyz', 'report', 'list');
      expect(html).toContain('id=folder-xyz');
      expect(html).toContain('q=report');
    });

    it('preserves layout and sort in search pagination', () => {
      const pagination = { page: 1, totalFiles: 30, totalPages: 3, from: 1, to: 10 };
      const html = helper.render(pagination, 'search', null, 'test', 'grid', 'date');
      expect(html).toContain('layout=grid');
      expect(html).toContain('sort=date');
    });
  });

  describe('recent view mode', () => {
    it('generates /recent URLs', () => {
      const pagination = { page: 1, totalFiles: 30, totalPages: 3, from: 1, to: 10 };
      const html = helper.render(pagination, 'recent', null, null, 'list');
      expect(html).toContain('href="/recent?layout=list&page=2"');
    });

    it('generates /recent URLs with page param on page 2', () => {
      const pagination = { page: 2, totalFiles: 30, totalPages: 3, from: 11, to: 20 };
      const html = helper.render(pagination, 'recent', null, null, 'list');
      expect(html).toContain('href="/recent?layout=list&page=3"');
    });

    it('does not include folder id or search query', () => {
      const pagination = { page: 1, totalFiles: 30, totalPages: 3, from: 1, to: 10 };
      const html = helper.render(pagination, 'recent', null, null, 'list');
      expect(html).not.toContain('id=');
      expect(html).not.toContain('q=');
    });

    it('preserves grid layout in recent pagination', () => {
      const pagination = { page: 1, totalFiles: 30, totalPages: 3, from: 1, to: 10 };
      const html = helper.render(pagination, 'recent', null, null, 'grid');
      expect(html).toContain('layout=grid');
    });
  });

  describe('starred view mode', () => {
    it('generates /starred URLs', () => {
      const pagination = { page: 1, totalFiles: 30, totalPages: 3, from: 1, to: 10 };
      const html = helper.render(pagination, 'starred', null, null, 'list');
      expect(html).toContain('href="/starred?layout=list&page=2"');
    });

    it('generates /starred URLs with page param on page 2', () => {
      const pagination = { page: 2, totalFiles: 30, totalPages: 3, from: 11, to: 20 };
      const html = helper.render(pagination, 'starred', null, null, 'list');
      expect(html).toContain('href="/starred?layout=list&page=3"');
    });

    it('preserves sort param in starred pagination', () => {
      const pagination = { page: 1, totalFiles: 30, totalPages: 3, from: 1, to: 10 };
      const html = helper.render(pagination, 'starred', null, null, 'list', 'date');
      expect(html).toContain('sort=date');
    });
  });

  describe('shared-with-me view mode', () => {
    it('generates /shared URLs', () => {
      const pagination = { page: 1, totalFiles: 30, totalPages: 3, from: 1, to: 10 };
      const html = helper.render(pagination, 'shared-with-me', null, null, 'list');
      expect(html).toContain('href="/shared?layout=list&page=2"');
    });

    it('generates /shared URLs with page param on page 2', () => {
      const pagination = { page: 2, totalFiles: 30, totalPages: 3, from: 11, to: 20 };
      const html = helper.render(pagination, 'shared-with-me', null, null, 'list');
      expect(html).toContain('href="/shared?layout=list&page=3"');
    });

    it('preserves grid layout in shared pagination', () => {
      const pagination = { page: 1, totalFiles: 30, totalPages: 3, from: 1, to: 10 };
      const html = helper.render(pagination, 'shared-with-me', null, null, 'grid');
      expect(html).toContain('layout=grid');
    });
  });

  describe('trash view mode', () => {
    it('generates /trash URLs', () => {
      const pagination = { page: 1, totalFiles: 30, totalPages: 3, from: 1, to: 10 };
      const html = helper.render(pagination, 'trash', null, null, 'list');
      expect(html).toContain('href="/trash?layout=list&page=2"');
    });

    it('generates /trash URLs with page param on page 2', () => {
      const pagination = { page: 2, totalFiles: 30, totalPages: 3, from: 11, to: 20 };
      const html = helper.render(pagination, 'trash', null, null, 'list');
      expect(html).toContain('href="/trash?layout=list&page=3"');
    });

    it('preserves sort param in trash pagination', () => {
      const pagination = { page: 1, totalFiles: 30, totalPages: 3, from: 1, to: 10 };
      const html = helper.render(pagination, 'trash', null, null, 'list', 'size');
      expect(html).toContain('sort=size');
    });
  });

  describe('home view mode', () => {
    it('generates / URLs for home viewMode', () => {
      const pagination = { page: 1, totalFiles: 30, totalPages: 3, from: 1, to: 10 };
      const html = helper.render(pagination, 'home', null, null, 'list');
      expect(html).toContain('href="/?layout=list&page=2"');
    });

    it('generates / URLs with page param on page 2', () => {
      const pagination = { page: 2, totalFiles: 30, totalPages: 3, from: 11, to: 20 };
      const html = helper.render(pagination, 'home', null, null, 'list');
      expect(html).toContain('href="/?layout=list&page=3"');
    });

    it('includes folder id when provided', () => {
      const pagination = { page: 1, totalFiles: 30, totalPages: 3, from: 1, to: 10 };
      const html = helper.render(pagination, 'home', 'folder-home', null, 'list');
      expect(html).toContain('id=folder-home');
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
