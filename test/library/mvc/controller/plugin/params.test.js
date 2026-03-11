const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const Params = require(path.join(projectRoot, 'library/mvc/controller/plugin/params'));

function createMockController(request = null) {
  return {
    getRequest: jest.fn(() => request),
    getResponse: jest.fn(() => ({})),
    getServiceManager: jest.fn(() => ({ get: jest.fn() })),
    plugin: jest.fn()
  };
}

function createMockRequest(data = {}) {
  return {
    getHeader: jest.fn((h, def) => data.headers?.[h] ?? def),
    getPost: jest.fn((p, def) => data.post?.[p] ?? def),
    getQuery: jest.fn((q, def) => data.query?.[q] ?? def),
    getParam: jest.fn((p, def) => data.params?.[p] ?? def)
  };
}

describe('Params Plugin', () => {
  it('should return default when no controller', () => {
    const params = new Params();
    expect(params.fromHeader('host', 'def')).toBe('def');
    expect(params.fromPost('name', 'def')).toBe('def');
    expect(params.fromQuery('page', 'def')).toBe('def');
    expect(params.fromRoute('id', 'def')).toBe('def');
  });

  it('should return default when controller has no request', () => {
    const params = new Params();
    params.setController(createMockController(null));
    expect(params.fromHeader('host', 'def')).toBe('def');
  });

  it('should get values from request', () => {
    const params = new Params();
    const req = createMockRequest({
      headers: { host: 'example.com' },
      post: { name: 'John' },
      query: { page: '2' },
      params: { id: '42' }
    });
    params.setController(createMockController(req));

    expect(params.fromHeader('host')).toBe('example.com');
    expect(params.fromPost('name')).toBe('John');
    expect(params.fromQuery('page')).toBe('2');
    expect(params.fromRoute('id')).toBe('42');
  });

  describe('fromAny', () => {
    it('should return default for null param', () => {
      const params = new Params();
      expect(params.fromAny(null, 'def')).toBe('def');
    });

    it('should search in order: route, query, post, header', () => {
      const params = new Params();
      const req = createMockRequest({
        params: { id: 'route-val' },
        query: { id: 'query-val' }
      });
      params.setController(createMockController(req));
      expect(params.fromAny('id')).toBe('route-val');
    });

    it('should fall through to query when route returns null', () => {
      const params = new Params();
      const req = createMockRequest({
        query: { page: '3' }
      });
      params.setController(createMockController(req));
      expect(params.fromAny('page')).toBe('3');
    });

    it('should fall through to post', () => {
      const params = new Params();
      const req = createMockRequest({
        post: { token: 'abc' }
      });
      params.setController(createMockController(req));
      expect(params.fromAny('token')).toBe('abc');
    });

    it('should fall through to header', () => {
      const params = new Params();
      const req = createMockRequest({
        headers: { 'x-token': 'xyz' }
      });
      params.setController(createMockController(req));
      expect(params.fromAny('x-token')).toBe('xyz');
    });

    it('should return default when not found anywhere', () => {
      const params = new Params();
      const req = createMockRequest({});
      params.setController(createMockController(req));
      expect(params.fromAny('missing', 'fallback')).toBe('fallback');
    });
  });

  // --- Branch coverage ---
  describe('branch coverage', () => {
    it('should handle controller without getRequest function (line 12)', () => {
      const params = new Params();
      params.controller = { getRequest: 'not-a-function' };
      expect(params.fromHeader('host', 'def')).toBe('def');
    });

    it('should handle request without getHeader function (line 18)', () => {
      const params = new Params();
      const req = { getPost: jest.fn(), getQuery: jest.fn(), getParam: jest.fn() };
      params.setController(createMockController(req));
      expect(params.fromHeader('host', 'fallback')).toBe('fallback');
    });

    it('should handle request without getPost function (line 24)', () => {
      const params = new Params();
      const req = { getHeader: jest.fn(), getQuery: jest.fn(), getParam: jest.fn() };
      params.setController(createMockController(req));
      expect(params.fromPost('name', 'fallback')).toBe('fallback');
    });

    it('should handle request without getQuery function (line 30)', () => {
      const params = new Params();
      const req = { getHeader: jest.fn(), getPost: jest.fn(), getParam: jest.fn() };
      params.setController(createMockController(req));
      expect(params.fromQuery('page', 'fallback')).toBe('fallback');
    });

    it('should handle request without getParam function (line 36)', () => {
      const params = new Params();
      const req = { getHeader: jest.fn(), getPost: jest.fn(), getQuery: jest.fn() };
      params.setController(createMockController(req));
      expect(params.fromRoute('id', 'fallback')).toBe('fallback');
    });

    it('should return default from fromAny when param is empty string (line 45)', () => {
      const params = new Params();
      expect(params.fromAny('', 'def')).toBe('def');
    });
  });
});
