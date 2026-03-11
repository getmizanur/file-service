const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const Redirect = require(path.join(projectRoot, 'library/mvc/controller/plugin/redirect'));

function createMockController(overrides = {}) {
  const mockResponse = {
    setRedirect: jest.fn(),
    setHeader: jest.fn(),
    setHttpResponseCode: jest.fn()
  };
  return {
    getRequest: jest.fn(() => ({})),
    getResponse: jest.fn(() => mockResponse),
    getServiceManager: jest.fn(() => ({ get: jest.fn() })),
    plugin: jest.fn(() => ({
      fromRoute: jest.fn((name) => `/resolved/${name}`)
    })),
    _mockResponse: mockResponse,
    ...overrides
  };
}

describe('Redirect Plugin', () => {
  let redirect;

  beforeEach(() => {
    redirect = new Redirect();
  });

  it('should return null when no controller', () => {
    expect(redirect.toUrl('/test')).toBeNull();
  });

  it('should return response when url is null', () => {
    const ctrl = createMockController();
    redirect.setController(ctrl);
    const result = redirect.toUrl(null);
    expect(result).toBeDefined();
  });

  it('should redirect to absolute URL', () => {
    const ctrl = createMockController();
    redirect.setController(ctrl);
    redirect.toUrl('/admin/posts');
    expect(ctrl._mockResponse.setRedirect).toHaveBeenCalledWith('/admin/posts', 302);
  });

  it('should redirect to full URL', () => {
    const ctrl = createMockController();
    redirect.setController(ctrl);
    redirect.toUrl('https://example.com');
    expect(ctrl._mockResponse.setRedirect).toHaveBeenCalledWith('https://example.com', 302);
  });

  it('should use custom status code', () => {
    const ctrl = createMockController();
    redirect.setController(ctrl);
    redirect.toUrl('/test', {}, { code: 301 });
    expect(ctrl._mockResponse.setRedirect).toHaveBeenCalledWith('/test', 301);
  });

  it('should resolve route names via url plugin', () => {
    const ctrl = createMockController();
    redirect.setController(ctrl);
    redirect.toUrl('blogIndex');
    expect(ctrl._mockResponse.setRedirect).toHaveBeenCalledWith('/resolved/blogIndex', 302);
  });

  it('should fall back to / when url plugin not available', () => {
    const ctrl = createMockController({ plugin: jest.fn(() => null) });
    redirect.setController(ctrl);
    redirect.toUrl('routeName');
    expect(ctrl._mockResponse.setRedirect).toHaveBeenCalledWith('/', 302);
  });

  it('should use setHeader/setHttpResponseCode when setRedirect is not available', () => {
    const response = { setHeader: jest.fn(), setHttpResponseCode: jest.fn() };
    const ctrl = createMockController({
      getResponse: jest.fn(() => response),
      _mockResponse: response
    });
    redirect.setController(ctrl);
    redirect.toUrl('/test');
    expect(response.setHeader).toHaveBeenCalledWith('Location', '/test', true);
    expect(response.setHttpResponseCode).toHaveBeenCalledWith(302);
    expect(response.redirected).toBe(true);
  });

  it('should return null when response is null', () => {
    const ctrl = createMockController({ getResponse: jest.fn(() => null) });
    redirect.setController(ctrl);
    expect(redirect.toUrl('/test')).toBeNull();
  });

  it('toRoute should alias toUrl', () => {
    const ctrl = createMockController();
    redirect.setController(ctrl);
    redirect.toRoute('/admin');
    expect(ctrl._mockResponse.setRedirect).toHaveBeenCalled();
  });

  // --- Branch coverage ---
  it('should handle controller without getResponse function (line 29)', () => {
    const mockResponse = { setRedirect: jest.fn() };
    redirect.controller = {
      getResponse: 'not-a-function',
      _mockResponse: mockResponse
    };
    expect(redirect.toUrl('/test')).toBeNull();
  });

  it('should handle controller without plugin function (line 49)', () => {
    const mockResponse = { setRedirect: jest.fn() };
    redirect.controller = {
      getResponse: jest.fn(() => mockResponse),
      plugin: 'not-a-function'
    };
    redirect.toUrl('routeName');
    expect(mockResponse.setRedirect).toHaveBeenCalledWith('/', 302);
  });

  it('should handle url plugin without fromRoute method (line 53)', () => {
    const ctrl = createMockController({ plugin: jest.fn(() => ({})) });
    redirect.setController(ctrl);
    redirect.toUrl('routeName');
    expect(ctrl._mockResponse.setRedirect).toHaveBeenCalledWith('/', 302);
  });

  it('should handle response without setHeader in _applyRedirect (line 63)', () => {
    const response = { setHttpResponseCode: jest.fn() };
    const ctrl = createMockController({
      getResponse: jest.fn(() => response),
      _mockResponse: response
    });
    redirect.setController(ctrl);
    redirect.toUrl('/test');
    expect(response.setHttpResponseCode).toHaveBeenCalledWith(302);
    expect(response.redirected).toBe(true);
  });

  it('should handle response without setHttpResponseCode in _applyRedirect (line 66)', () => {
    const response = { setHeader: jest.fn() };
    const ctrl = createMockController({
      getResponse: jest.fn(() => response),
      _mockResponse: response
    });
    redirect.setController(ctrl);
    redirect.toUrl('/test');
    expect(response.setHeader).toHaveBeenCalledWith('Location', '/test', true);
    expect(response.redirected).toBe(true);
  });

  it('should handle response without any redirect methods (line 69)', () => {
    const response = {};
    const ctrl = createMockController({
      getResponse: jest.fn(() => response),
      _mockResponse: response
    });
    redirect.setController(ctrl);
    redirect.toUrl('/test');
    expect(response.redirected).toBe(true);
  });

  it('should handle protocol-relative URL (line 44)', () => {
    const ctrl = createMockController();
    redirect.setController(ctrl);
    redirect.toUrl('//cdn.example.com/resource');
    expect(ctrl._mockResponse.setRedirect).toHaveBeenCalledWith('//cdn.example.com/resource', 302);
  });

  it('should default code to 302 when options is null (line 36)', () => {
    const ctrl = createMockController();
    redirect.setController(ctrl);
    redirect.toUrl('/test', {}, null);
    expect(ctrl._mockResponse.setRedirect).toHaveBeenCalledWith('/test', 302);
  });

  it('should return response when url is empty string (line 34)', () => {
    const ctrl = createMockController();
    redirect.setController(ctrl);
    const result = redirect.toUrl('');
    expect(result).toBe(ctrl._mockResponse);
  });
});
