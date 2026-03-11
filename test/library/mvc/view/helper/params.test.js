const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const Params = require(path.join(projectRoot, 'library/mvc/view/helper/params'));

describe('Params View Helper', () => {
  let helper;

  beforeEach(() => {
    helper = new Params();
  });

  describe('setRequest', () => {
    it('should set request and return this', () => {
      const req = {};
      expect(helper.setRequest(req)).toBe(helper);
      expect(helper.request).toBe(req);
    });
  });

  describe('_getRequest', () => {
    it('should return explicit request first', () => {
      const req = { query: {} };
      helper.setRequest(req);
      expect(helper._getRequest()).toBe(req);
    });

    it('should fall back to nunjucks context request', () => {
      helper.setContext({ request: { query: { test: 1 } } });
      expect(helper._getRequest()).toBeDefined();
    });

    it('should fall back to ctx.req', () => {
      helper.setContext({ req: { body: {} } });
      expect(helper._getRequest()).toBeDefined();
    });

    it('should return null when no request available', () => {
      expect(helper._getRequest()).toBeNull();
    });
  });

  describe('fromQuery', () => {
    it('should return query param via getQuery', () => {
      helper.setRequest({ getQuery: (name, def) => name === 'page' ? '2' : def });
      expect(helper.fromQuery('page')).toBe('2');
    });

    it('should fall back to req.query', () => {
      helper.setRequest({ query: { search: 'hello' } });
      expect(helper.fromQuery('search')).toBe('hello');
    });

    it('should return default when missing', () => {
      helper.setRequest({ query: {} });
      expect(helper.fromQuery('missing', 'default')).toBe('default');
    });

    it('should return default when no request', () => {
      expect(helper.fromQuery('key', 'def')).toBe('def');
    });
  });

  describe('fromPost', () => {
    it('should return post param via getPost', () => {
      helper.setRequest({ getPost: (name) => name === 'email' ? 'a@b.com' : null });
      expect(helper.fromPost('email')).toBe('a@b.com');
    });

    it('should fall back to req.body', () => {
      helper.setRequest({ body: { name: 'John' } });
      expect(helper.fromPost('name')).toBe('John');
    });

    it('should return default when no request', () => {
      expect(helper.fromPost('key', 'def')).toBe('def');
    });

    it('should return default when body exists but key is missing', () => {
      helper.setRequest({ body: { other: 'value' } });
      expect(helper.fromPost('missing', 'fallback')).toBe('fallback');
    });
  });

  describe('fromRoute', () => {
    it('should return route param via getParam', () => {
      helper.setRequest({ getParam: (name) => name === 'id' ? '42' : null });
      expect(helper.fromRoute('id')).toBe('42');
    });

    it('should fall back to req.params', () => {
      helper.setRequest({ params: { slug: 'test-post' } });
      expect(helper.fromRoute('slug')).toBe('test-post');
    });

    it('should return default when no request', () => {
      expect(helper.fromRoute('key', 'def')).toBe('def');
    });
  });

  describe('render', () => {
    it('should return helper instance when no name', () => {
      expect(helper.render()).toBe(helper);
    });

    it('should return default when no request', () => {
      expect(helper.render('key', 'fallback')).toBe('fallback');
    });

    it('should resolve route > query > post', () => {
      helper.setRequest({
        getParam: (name) => name === 'id' ? '42' : null,
        getQuery: () => null,
        getPost: () => null
      });
      expect(helper.render('id')).toBe('42');
    });

    it('should fall through to query if route empty', () => {
      helper.setRequest({
        params: {},
        query: { page: '3' },
        body: {}
      });
      expect(helper.render('page')).toBe('3');
    });

    it('should fall through to post if route and query are empty', () => {
      helper.setRequest({
        params: {},
        query: {},
        body: { email: 'test@example.com' }
      });
      expect(helper.render('email')).toBe('test@example.com');
    });

    it('should return default when route, query, and post all miss', () => {
      helper.setRequest({
        params: {},
        query: {},
        body: {}
      });
      expect(helper.render('nonexistent', 'mydefault')).toBe('mydefault');
    });
  });
});
