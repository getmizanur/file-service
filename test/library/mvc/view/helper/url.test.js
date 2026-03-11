const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const Url = require(path.join(projectRoot, 'library/mvc/view/helper/url'));

describe('Url View Helper', () => {
  let helper;

  beforeEach(() => {
    helper = new Url();
    // Pre-load routes to avoid file system dependency
    helper.routes = {
      home: { route: '/' },
      blogIndex: { route: '/blog' },
      blogDetail: { route: '/blog/:slug' },
      postEdit: { route: '/admin/posts/:id/edit' },
      postOptional: { route: '/posts/:id(/page/:page)?' }
    };
  });

  describe('constructor', () => {
    it('should initialize with defaults', () => {
      const u = new Url();
      expect(u.routes).toBeNull();
      expect(u.debug).toBe(false);
    });
  });

  describe('setServiceManager / setDebug', () => {
    it('should set and return this', () => {
      expect(helper.setServiceManager({})).toBe(helper);
      expect(helper.setDebug(true)).toBe(helper);
      expect(helper.debug).toBe(true);
    });
  });

  describe('fromRoute', () => {
    it('should generate simple route', () => {
      expect(helper.fromRoute('home')).toBe('/');
      expect(helper.fromRoute('blogIndex')).toBe('/blog');
    });

    it('should replace path params', () => {
      expect(helper.fromRoute('blogDetail', { slug: 'my-post' })).toBe('/blog/my-post');
    });

    it('should encode path params', () => {
      expect(helper.fromRoute('blogDetail', { slug: 'hello world' })).toBe('/blog/hello%20world');
    });

    it('should add unused params as query string', () => {
      const url = helper.fromRoute('blogIndex', { page: '2' });
      expect(url).toContain('?page=2');
    });

    it('should add query option params', () => {
      const url = helper.fromRoute('home', {}, { query: { ref: 'test' } });
      expect(url).toContain('?ref=test');
    });

    it('should add hash', () => {
      const url = helper.fromRoute('home', {}, { hash: 'section' });
      expect(url).toContain('#section');
    });

    it('should strip unresolved optional segments', () => {
      const url = helper.fromRoute('postOptional', { id: '42' });
      expect(url).toContain('/posts/42');
    });

    it('should return empty for unknown route', () => {
      expect(helper.fromRoute('nonExistent')).toBe('');
    });

    it('should return empty for null name', () => {
      expect(helper.fromRoute(null)).toBe('');
    });
  });

  describe('render', () => {
    it('should delegate to fromRoute', () => {
      expect(helper.render('blogIndex')).toBe('/blog');
    });
  });

  describe('_getRoutes', () => {
    it('should return cached routes', () => {
      expect(helper._getRoutes()).toBe(helper.routes);
    });

    it('should load from ServiceManager config', () => {
      const u = new Url();
      u.serviceManager = {
        get: jest.fn(() => ({ router: { routes: { test: { route: '/test' } } } }))
      };
      const routes = u._getRoutes();
      expect(routes.test).toBeDefined();
    });

    it('should fallback to routes.config.js file', () => {
      const u = new Url();
      const routes = u._getRoutes();
      // Should load from file or return empty
      expect(typeof routes).toBe('object');
    });

    it('should log and skip when serviceManager.get() throws', () => {
      const u = new Url();
      u.setDebug(true);
      u.serviceManager = {
        get: jest.fn(() => { throw new Error('Config not found'); })
      };
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      const routes = u._getRoutes();
      expect(typeof routes).toBe('object');
      expect(spy).toHaveBeenCalledWith(
        '[UrlHelper]',
        'Failed to load routes from ServiceManager config:',
        'Config not found'
      );
      spy.mockRestore();
    });

    it('should return empty and log when globalThis.applicationPath is not a function', () => {
      const u = new Url();
      u.setDebug(true);
      const originalAppPath = globalThis.applicationPath;
      globalThis.applicationPath = undefined;
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      const routes = u._getRoutes();
      expect(routes).toEqual({});
      expect(spy).toHaveBeenCalledWith(
        '[UrlHelper]',
        'globalThis.applicationPath is not defined; skipping file fallback'
      );
      spy.mockRestore();
      globalThis.applicationPath = originalAppPath;
    });

    it('should return empty and log when require of routes config fails', () => {
      const u = new Url();
      u.setDebug(true);
      const originalAppPath = globalThis.applicationPath;
      globalThis.applicationPath = (p) => '/nonexistent/path/' + p;
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      const routes = u._getRoutes();
      expect(routes).toEqual({});
      expect(spy).toHaveBeenCalledWith(
        '[UrlHelper]',
        expect.stringContaining('Failed to load routes configuration from file:'),
        expect.any(String)
      );
      spy.mockRestore();
      globalThis.applicationPath = originalAppPath;
    });
  });

  describe('branch coverage', () => {
    it('should handle route with empty route string (line 144)', () => {
      helper.routes.emptyRoute = {};
      const result = helper.fromRoute('emptyRoute');
      expect(result).toBe('');
    });

    it('should skip inherited properties in parameters (line 87)', () => {
      const parent = { inherited: 'nope' };
      const params = Object.create(parent);
      params.slug = 'test';
      const result = helper.fromRoute('blogDetail', params);
      expect(result).toBe('/blog/test');
      expect(result).not.toContain('inherited');
    });

    it('should skip inherited properties in query options (line 156)', () => {
      const parent = { inherited: 'nope' };
      const query = Object.create(parent);
      query.page = '1';
      const result = helper.fromRoute('home', {}, { query });
      expect(result).toContain('page=1');
      expect(result).not.toContain('inherited');
    });

    it('should use & separator when route already contains ? (line 163)', () => {
      helper.routes.withQuery = { route: '/search?default=true' };
      const result = helper.fromRoute('withQuery', { extra: 'val' });
      expect(result).toContain('?default=true');
      expect(result).toContain('&extra=val');
    });

    it('should handle ServiceManager config without router property (line 53)', () => {
      const u = new Url();
      u.serviceManager = {
        get: jest.fn(() => ({ noRouter: true }))
      };
      const routes = u._getRoutes();
      expect(typeof routes).toBe('object');
    });

    it('should handle ServiceManager config with router but no routes (line 53)', () => {
      const u = new Url();
      u.serviceManager = {
        get: jest.fn(() => ({ router: {} }))
      };
      const routes = u._getRoutes();
      expect(typeof routes).toBe('object');
    });

    it('should handle hash with value 0 (line 167)', () => {
      const result = helper.fromRoute('home', {}, { hash: 0 });
      expect(result).toContain('#0');
    });

    it('should not add hash when hash is null (line 167)', () => {
      const result = helper.fromRoute('home', {}, { hash: null });
      expect(result).not.toContain('#');
    });
  });

  describe('_log', () => {
    it('should not log when debug is false', () => {
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      helper._log('test');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should log when debug is true', () => {
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      helper.setDebug(true);
      helper._log('test');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
