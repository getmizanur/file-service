const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const Url = require(path.join(projectRoot, 'library/mvc/controller/plugin/url'));

function createMockController(routes = {}) {
  return {
    getRequest: jest.fn(() => ({})),
    getResponse: jest.fn(() => ({})),
    getServiceManager: jest.fn(() => ({ get: jest.fn() })),
    plugin: jest.fn(),
    getConfig: jest.fn(() => ({ router: { routes } }))
  };
}

describe('Url Plugin', () => {
  let url;

  beforeEach(() => {
    url = new Url();
  });

  it('should return null when no controller', () => {
    expect(url.fromRoute('test')).toBeNull();
  });

  it('should return null for unknown route', () => {
    url.setController(createMockController({}));
    expect(url.fromRoute('unknown')).toBeNull();
  });

  it('should return simple route', () => {
    url.setController(createMockController({ home: { route: '/' } }));
    expect(url.fromRoute('home')).toBe('/');
  });

  it('should substitute params', () => {
    url.setController(createMockController({
      post: { route: '/posts/:id/edit' }
    }));
    expect(url.fromRoute('post', { id: 42 })).toBe('/posts/42/edit');
  });

  it('should encode param values', () => {
    url.setController(createMockController({
      search: { route: '/search/:q' }
    }));
    expect(url.fromRoute('search', { q: 'hello world' })).toBe('/search/hello%20world');
  });

  it('should strip unresolved params', () => {
    url.setController(createMockController({
      page: { route: '/posts/:id/page/:page' }
    }));
    expect(url.fromRoute('page', { id: 5 })).toBe('/posts/5/page');
  });

  it('should handle null param values', () => {
    url.setController(createMockController({
      test: { route: '/test/:id' }
    }));
    expect(url.fromRoute('test', { id: null })).toBe('/test');
  });

  it('should add query string', () => {
    url.setController(createMockController({ list: { route: '/list' } }));
    const result = url.fromRoute('list', {}, { query: { page: 2, sort: 'name' } });
    expect(result).toContain('page=2');
    expect(result).toContain('sort=name');
  });

  it('should add hash fragment', () => {
    url.setController(createMockController({ home: { route: '/' } }));
    expect(url.fromRoute('home', {}, { hash: 'top' })).toBe('/#top');
  });

  it('should use fragment alias', () => {
    url.setController(createMockController({ home: { route: '/' } }));
    expect(url.fromRoute('home', {}, { fragment: 'bottom' })).toBe('/#bottom');
  });

  it('should handle array query values', () => {
    url.setController(createMockController({ list: { route: '/list' } }));
    const result = url.fromRoute('list', {}, { query: { tags: ['a', 'b'] } });
    expect(result).toContain('tags=a');
    expect(result).toContain('tags=b');
  });

  it('should handle object query values', () => {
    url.setController(createMockController({ list: { route: '/list' } }));
    const result = url.fromRoute('list', {}, { query: { filter: { status: 'active' } } });
    expect(result).toContain('filter');
    expect(result).toContain('active');
  });

  it('should skip null/undefined in query arrays/objects', () => {
    url.setController(createMockController({ list: { route: '/list' } }));
    const result = url.fromRoute('list', {}, { query: { a: null, b: undefined, tags: [null] } });
    expect(result).toBe('/list');
  });

  it('should return null for route with null route property', () => {
    url.setController(createMockController({ bad: { route: null } }));
    expect(url.fromRoute('bad')).toBeNull();
  });

  describe('_collapseSlashes', () => {
    it('should collapse multiple slashes', () => {
      expect(url._collapseSlashes('/a//b///c')).toBe('/a/b/c');
    });

    it('should preserve protocol slashes', () => {
      expect(url._collapseSlashes('https://example.com//path')).toBe('https://example.com/path');
    });

    it('should handle null/empty', () => {
      expect(url._collapseSlashes(null)).toBeNull();
      expect(url._collapseSlashes('')).toBe('');
    });
  });

  describe('_buildQueryString', () => {
    it('should build simple query string', () => {
      expect(url._buildQueryString({ a: 1 })).toBe('a=1');
    });

    it('should handle empty object', () => {
      expect(url._buildQueryString({})).toBe('');
    });

    it('should handle null', () => {
      expect(url._buildQueryString(null)).toBe('');
    });
  });

  describe('_stripUnresolvedOptionalGroups', () => {
    it('should strip optional groups with unresolved params', () => {
      expect(url._stripUnresolvedOptionalGroups('/path(/:optional)?')).toBe('/path');
    });

    it('should keep resolved optional groups', () => {
      expect(url._stripUnresolvedOptionalGroups('/path(/resolved)?')).toBe('/path/resolved');
    });
  });
});
