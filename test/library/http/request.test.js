const path = require('path');
const projectRoot = path.resolve(__dirname, '../../..');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const Request = require(path.join(projectRoot, 'library/http/request'));

describe('Request', () => {
  let request;

  beforeEach(() => {
    request = new Request();
  });

  // --- Constructor ---
  describe('constructor', () => {
    it('should initialise with null defaults when no args', () => {
      expect(request.expressRequest).toBeNull();
      expect(request.method).toBeNull();
      expect(request.query).toBeNull();
      expect(request.post).toBeNull();
      expect(request.headers).toBeNull();
      expect(request.params).toBeNull();
      expect(request.routePath).toBeNull();
      expect(request.url).toBeNull();
      expect(request.path).toBeNull();
      expect(request.session).toBeNull();
    });

    it('should accept options overrides', () => {
      const req = new Request(null, {
        method: 'POST',
        query: { page: '1' },
        post: { title: 'Hello' },
        headers: { 'content-type': 'text/html' },
        params: { id: '5' },
        routePath: '/posts/:id',
        url: '/posts/5?page=1',
        path: '/posts/5',
        session: { userId: 42 },
      });

      expect(req.method).toBe('POST');
      expect(req.query).toEqual({ page: '1' });
      expect(req.post).toEqual({ title: 'Hello' });
      expect(req.headers).toEqual({ 'content-type': 'text/html' });
      expect(req.params).toEqual({ id: '5' });
      expect(req.routePath).toBe('/posts/:id');
      expect(req.url).toBe('/posts/5?page=1');
      expect(req.path).toBe('/posts/5');
      expect(req.session).toEqual({ userId: 42 });
    });
  });

  // --- Express request/response ---
  describe('setExpressRequest / getExpressRequest / req', () => {
    it('should store and return the express request', () => {
      const fakeReq = { method: 'GET', on: jest.fn() };
      request.setExpressRequest(fakeReq);
      expect(request.getExpressRequest()).toBe(fakeReq);
      expect(request.req()).toBe(fakeReq);
    });
  });

  describe('getExpressResponse / res', () => {
    it('should return null when no express request', () => {
      expect(request.getExpressResponse()).toBeNull();
      expect(request.res()).toBeNull();
    });

    it('should return expressRequest.res when present', () => {
      const fakeRes = { send: jest.fn() };
      const fakeReq = { res: fakeRes, on: jest.fn() };
      request.setExpressRequest(fakeReq);
      expect(request.getExpressResponse()).toBe(fakeRes);
      expect(request.res()).toBe(fakeRes);
    });
  });

  // --- Method ---
  describe('setMethod / getMethod', () => {
    it('should set and get a valid HTTP method', () => {
      request.setMethod('post');
      expect(request.getMethod()).toBe('POST');
    });

    it('should throw 405 for invalid method', () => {
      expect(() => request.setMethod('INVALID')).toThrow('Method Not Allowed');
      try {
        request.setMethod('INVALID');
      } catch (e) {
        expect(e.statusCode).toBe(405);
        expect(e.method).toBe('INVALID');
      }
    });

    it('should fall back to express method when override is null', () => {
      const fakeReq = { method: 'put', on: jest.fn() };
      request.setExpressRequest(fakeReq);
      expect(request.getMethod()).toBe('PUT');
    });

    it('should return null when no method set and no express request', () => {
      expect(request.getMethod()).toBeNull();
    });
  });

  // --- Post ---
  describe('setPost / getPost', () => {
    it('should return override post data', () => {
      request.setPost({ title: 'Hello', body: 'World' });
      expect(request.getPost(null)).toEqual({ title: 'Hello', body: 'World' });
      expect(request.getPost('title')).toBe('Hello');
      expect(request.getPost('missing', 'default')).toBe('default');
    });

    it('should fall back to express body', () => {
      const fakeReq = { body: { name: 'Express' }, on: jest.fn() };
      request.setExpressRequest(fakeReq);
      expect(request.getPost('name')).toBe('Express');
    });

    it('should return empty object when key is null and no data', () => {
      expect(request.getPost(null)).toEqual({});
    });

    it('should return default when key is specified and no data', () => {
      expect(request.getPost('key', 'fallback')).toBe('fallback');
    });
  });

  // --- Query ---
  describe('setQuery / getQuery', () => {
    it('should return override query data', () => {
      request.setQuery({ page: '2', sort: 'date' });
      expect(request.getQuery(null)).toEqual({ page: '2', sort: 'date' });
      expect(request.getQuery('page')).toBe('2');
      expect(request.getQuery('missing', 'default')).toBe('default');
    });

    it('should fall back to express query', () => {
      const fakeReq = { query: { q: 'search' }, on: jest.fn() };
      request.setExpressRequest(fakeReq);
      expect(request.getQuery('q')).toBe('search');
    });

    it('should return empty object when key is null and no data', () => {
      expect(request.getQuery(null)).toEqual({});
    });
  });

  // --- Headers ---
  describe('setHeaders / getHeaders / getHeader', () => {
    it('should return override headers', () => {
      request.setHeaders({ 'content-type': 'application/json', 'x-custom': 'val' });
      expect(request.getHeaders(null)).toEqual({ 'content-type': 'application/json', 'x-custom': 'val' });
      expect(request.getHeaders('content-type')).toBe('application/json');
      expect(request.getHeader('x-custom')).toBe('val');
      expect(request.getHeader('missing', 'default')).toBe('default');
    });

    it('should fall back to express headers', () => {
      const fakeReq = { headers: { host: 'localhost' }, on: jest.fn() };
      request.setExpressRequest(fakeReq);
      expect(request.getHeaders('host')).toBe('localhost');
    });
  });

  // --- Params ---
  describe('setParams / getParam / getParams', () => {
    it('should return override params', () => {
      request.setParams({ id: '10', slug: 'test' });
      expect(request.getParam('id')).toBe('10');
      expect(request.getParam('missing', 'none')).toBe('none');
      expect(request.getParams()).toEqual({ id: '10', slug: 'test' });
    });

    it('should fall back to express params', () => {
      const fakeReq = { params: { id: '20' }, on: jest.fn() };
      request.setExpressRequest(fakeReq);
      expect(request.getParam('id')).toBe('20');
      expect(request.getParams()).toEqual({ id: '20' });
    });

    it('should return all params when key is null', () => {
      request.setParams({ a: '1', b: '2' });
      expect(request.getParam(null)).toEqual({ a: '1', b: '2' });
    });

    it('should return empty object for getParams when no data', () => {
      expect(request.getParams()).toEqual({});
    });
  });

  // --- RoutePath ---
  describe('setRoutePath / getRoutePath', () => {
    it('should return override routePath', () => {
      request.setRoutePath('/api/posts');
      expect(request.getRoutePath()).toBe('/api/posts');
    });

    it('should fall back to express route.path', () => {
      const fakeReq = { route: { path: '/express/route' }, on: jest.fn() };
      request.setExpressRequest(fakeReq);
      expect(request.getRoutePath()).toBe('/express/route');
    });

    it('should fall back to express path when no route', () => {
      const fakeReq = { path: '/express/path', on: jest.fn() };
      request.setExpressRequest(fakeReq);
      expect(request.getRoutePath()).toBe('/express/path');
    });

    it('should return null when nothing is set', () => {
      expect(request.getRoutePath()).toBeNull();
    });
  });

  // --- URL ---
  describe('setUrl / getUrl', () => {
    it('should return override url', () => {
      request.setUrl('/test?q=1');
      expect(request.getUrl()).toBe('/test?q=1');
    });

    it('should fall back to express url', () => {
      const fakeReq = { url: '/express-url', on: jest.fn() };
      request.setExpressRequest(fakeReq);
      expect(request.getUrl()).toBe('/express-url');
    });

    it('should return null when nothing is set', () => {
      expect(request.getUrl()).toBeNull();
    });
  });

  // --- Path ---
  describe('setPath / getPath', () => {
    it('should return override path', () => {
      request.setPath('/test');
      expect(request.getPath()).toBe('/test');
    });

    it('should fall back to express path', () => {
      const fakeReq = { path: '/express-path', on: jest.fn() };
      request.setExpressRequest(fakeReq);
      expect(request.getPath()).toBe('/express-path');
    });

    it('should return null when nothing is set', () => {
      expect(request.getPath()).toBeNull();
    });
  });

  // --- Session ---
  describe('setSession / getSession', () => {
    it('should return override session', () => {
      request.setSession({ userId: 1 });
      expect(request.getSession()).toEqual({ userId: 1 });
    });

    it('should fall back to express session', () => {
      const fakeReq = { session: { token: 'abc' }, on: jest.fn() };
      request.setExpressRequest(fakeReq);
      expect(request.getSession()).toEqual({ token: 'abc' });
    });

    it('should return null when nothing is set', () => {
      expect(request.getSession()).toBeNull();
    });
  });

  // --- Convenience helpers ---
  describe('isGet / isPost / isPut / isDelete / isPatch', () => {
    it('isGet should return true when method is GET', () => {
      request.setMethod('GET');
      expect(request.isGet()).toBe(true);
      expect(request.isPost()).toBe(false);
    });

    it('isPost should return true when method is POST', () => {
      request.setMethod('POST');
      expect(request.isPost()).toBe(true);
      expect(request.isGet()).toBe(false);
    });

    it('isPut should return true when method is PUT', () => {
      request.setMethod('PUT');
      expect(request.isPut()).toBe(true);
    });

    it('isDelete should return true when method is DELETE', () => {
      request.setMethod('DELETE');
      expect(request.isDelete()).toBe(true);
    });

    it('isPatch should return true when method is PATCH', () => {
      request.setMethod('PATCH');
      expect(request.isPatch()).toBe(true);
    });
  });

  // --- Fluent API ---
  describe('fluent API', () => {
    it('setters should return this for chaining', () => {
      expect(request.setMethod('GET')).toBe(request);
      expect(request.setPost({})).toBe(request);
      expect(request.setQuery({})).toBe(request);
      expect(request.setHeaders({})).toBe(request);
      expect(request.setParams({})).toBe(request);
      expect(request.setRoutePath('/')).toBe(request);
      expect(request.setUrl('/')).toBe(request);
      expect(request.setPath('/')).toBe(request);
      expect(request.setSession({})).toBe(request);
    });
  });
});
