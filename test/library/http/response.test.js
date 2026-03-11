const path = require('path');
const projectRoot = path.resolve(__dirname, '../../..');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const Response = require(path.join(projectRoot, 'library/http/response'));

describe('Response', () => {
  let response;

  beforeEach(() => {
    response = new Response();
  });

  // --- Constructor ---
  describe('constructor', () => {
    it('should initialise with sensible defaults', () => {
      expect(response.expressResponse).toBeNull();
      expect(response.headers).toEqual({});
      expect(response.httpResponseCode).toBe(200);
      expect(response.redirected).toBe(false);
      expect(response.body).toBeNull();
      expect(response.hasBody).toBe(false);
      expect(response.sendHeaders).toBe(false);
    });

    it('should accept an express response', () => {
      const fakeRes = { status: jest.fn() };
      const res = new Response(fakeRes);
      expect(res.getExpressResponse()).toBe(fakeRes);
    });
  });

  // --- Express response ---
  describe('setExpressResponse / getExpressResponse', () => {
    it('should store and return the express response', () => {
      const fakeRes = { send: jest.fn() };
      response.setExpressResponse(fakeRes);
      expect(response.getExpressResponse()).toBe(fakeRes);
    });

    it('should return this for chaining', () => {
      expect(response.setExpressResponse(null)).toBe(response);
    });
  });

  // --- _normalizeHeaders ---
  describe('_normalizeHeaders', () => {
    it('should normalize header names to Title-Case', () => {
      // ucwords capitalises the first letter of each word after strReplace
      const ct = response._normalizeHeaders('content-type');
      expect(ct).toBe('Content-type');
      const xch = response._normalizeHeaders('x-custom-header');
      expect(xch).toBe('X-custom-header');
    });

    it('should throw TypeError for non-string input', () => {
      expect(() => response._normalizeHeaders(123)).toThrow(TypeError);
      expect(() => response._normalizeHeaders(null)).toThrow(TypeError);
      expect(() => response._normalizeHeaders(undefined)).toThrow(TypeError);
      expect(() => response._normalizeHeaders({})).toThrow(TypeError);
    });
  });

  // --- canSendHeaders ---
  describe('canSendHeaders', () => {
    it('should initially return false', () => {
      expect(response.canSendHeaders()).toBe(false);
    });

    it('should return true after being set with headersSent=true', () => {
      response.canSendHeaders(true);
      expect(response.canSendHeaders()).toBe(true);
    });
  });

  // --- Header operations ---
  describe('setHeader / getHeader / getHeaders / addHeader / clearHeaders / clearHeader', () => {
    it('should set and get a header', () => {
      response.setHeader('content-type', 'text/html');
      expect(response.getHeader('content-type')).toBe('text/html');
    });

    it('should replace header by default', () => {
      response.setHeader('content-type', 'text/html');
      response.setHeader('content-type', 'application/json');
      expect(response.getHeader('content-type')).toBe('application/json');
    });

    it('should allow multiple values with addHeader', () => {
      response.addHeader('set-cookie', 'a=1');
      response.addHeader('set-cookie', 'b=2');
      expect(response.getHeader('set-cookie')).toEqual(['a=1', 'b=2']);
    });

    it('should allow multiple values with replace=false', () => {
      response.setHeader('x-custom', 'first', false);
      response.setHeader('x-custom', 'second', false);
      response.setHeader('x-custom', 'third', false);
      expect(response.getHeader('x-custom')).toEqual(['first', 'second', 'third']);
    });

    it('should return default when header not found', () => {
      expect(response.getHeader('missing', 'fallback')).toBe('fallback');
    });

    it('getHeaders should return all headers', () => {
      response.setHeader('content-type', 'text/html');
      response.setHeader('x-custom', 'val');
      const headers = response.getHeaders();
      expect(headers).toHaveProperty('Content-type', 'text/html');
      expect(headers).toHaveProperty('X-custom', 'val');
    });

    it('clearHeaders should remove all headers', () => {
      response.setHeader('content-type', 'text/html');
      response.clearHeaders();
      expect(response.getHeaders()).toEqual({});
    });

    it('clearHeader should remove a specific header', () => {
      response.setHeader('content-type', 'text/html');
      response.setHeader('x-custom', 'val');
      response.clearHeader('content-type');
      expect(response.getHeader('content-type')).toBeNull();
      expect(response.getHeader('x-custom')).toBe('val');
    });

    it('should mark sendHeaders as true after setHeader', () => {
      response.setHeader('x-test', 'val');
      expect(response.canSendHeaders()).toBe(true);
    });
  });

  // --- HTTP response code ---
  describe('setHttpResponseCode / status / getHttpResponseCode', () => {
    it('should set and get response code', () => {
      response.setHttpResponseCode(404);
      expect(response.getHttpResponseCode()).toBe(404);
    });

    it('status should be an alias for setHttpResponseCode', () => {
      response.status(201);
      expect(response.getHttpResponseCode()).toBe(201);
    });

    it('should throw for invalid response codes', () => {
      expect(() => response.setHttpResponseCode(99)).toThrow('Invalid HTTP response code');
      expect(() => response.setHttpResponseCode(600)).toThrow('Invalid HTTP response code');
      expect(() => response.setHttpResponseCode('abc')).toThrow('Invalid HTTP response code');
      expect(() => response.setHttpResponseCode(null)).toThrow('Invalid HTTP response code');
    });

    it('should set redirected flag for 3xx codes', () => {
      response.setHttpResponseCode(301);
      expect(response.isRedirect()).toBe(true);
    });

    it('should not set redirected flag for non-3xx codes', () => {
      response.setHttpResponseCode(200);
      expect(response.isRedirect()).toBe(false);
    });

    it('should return this for chaining', () => {
      expect(response.setHttpResponseCode(200)).toBe(response);
      expect(response.status(200)).toBe(response);
    });
  });

  // --- Body ---
  describe('setBody / getBody / clearBody', () => {
    it('should set and get body', () => {
      response.setBody('Hello World');
      expect(response.getBody()).toBe('Hello World');
      expect(response.hasBody).toBe(true);
    });

    it('should return default when body is null', () => {
      expect(response.getBody('default')).toBe('default');
    });

    it('should mark hasBody false for empty/null/undefined', () => {
      response.setBody(null);
      expect(response.hasBody).toBe(false);

      response.setBody('');
      expect(response.hasBody).toBe(false);

      response.setBody(undefined);
      expect(response.hasBody).toBe(false);
    });

    it('clearBody should reset body and hasBody', () => {
      response.setBody('content');
      response.clearBody();
      expect(response.getBody()).toBeNull();
      expect(response.hasBody).toBe(false);
    });

    it('should return this for chaining', () => {
      expect(response.setBody('test')).toBe(response);
      expect(response.clearBody()).toBe(response);
    });
  });

  // --- json ---
  describe('json', () => {
    it('should set content-type, status code, and JSON body', () => {
      const payload = { message: 'ok', count: 5 };
      response.json(payload, 201);

      expect(response.getHeader('content-type')).toBe('application/json; charset=utf-8');
      expect(response.getHttpResponseCode()).toBe(201);
      expect(response.getBody()).toBe(JSON.stringify(payload));
    });

    it('should default to status 200', () => {
      response.json({ ok: true });
      expect(response.getHttpResponseCode()).toBe(200);
    });

    it('should return this for chaining', () => {
      expect(response.json({})).toBe(response);
    });
  });

  // --- Redirect ---
  describe('setRedirect / isRedirect', () => {
    it('should set Location header and redirect flag', () => {
      response.setRedirect('/new-url');
      expect(response.getHeader('location')).toBe('/new-url');
      expect(response.isRedirect()).toBe(true);
      expect(response.getHttpResponseCode()).toBe(302);
    });

    it('should accept a custom redirect code', () => {
      response.setRedirect('/permanent', 301);
      expect(response.getHttpResponseCode()).toBe(301);
      expect(response.isRedirect()).toBe(true);
    });

    it('should return this for chaining', () => {
      expect(response.setRedirect('/url')).toBe(response);
    });
  });

  // --- flushToExpress ---
  describe('flushToExpress', () => {
    let mockExpressRes;

    beforeEach(() => {
      mockExpressRes = {
        status: jest.fn(),
        setHeader: jest.fn(),
        send: jest.fn(),
        end: jest.fn(),
        redirect: jest.fn(),
      };
    });

    it('should return false when no express response is available', () => {
      expect(response.flushToExpress()).toBe(false);
    });

    it('should flush status, headers, and body to express response', () => {
      response.setHttpResponseCode(201);
      response.setHeader('x-custom', 'val');
      response.setBody('Hello');

      response.flushToExpress(mockExpressRes);

      expect(mockExpressRes.status).toHaveBeenCalledWith(201);
      expect(mockExpressRes.setHeader).toHaveBeenCalledWith('X-custom', 'val');
      expect(mockExpressRes.send).toHaveBeenCalledWith('Hello');
    });

    it('should call end() when there is no body', () => {
      response.flushToExpress(mockExpressRes);
      expect(mockExpressRes.end).toHaveBeenCalled();
    });

    it('should redirect when isRedirect is true', () => {
      response.setRedirect('/new-location', 302);
      response.flushToExpress(mockExpressRes);

      expect(mockExpressRes.redirect).toHaveBeenCalledWith('/new-location');
    });

    it('should use stored expressResponse when no arg passed', () => {
      response.setExpressResponse(mockExpressRes);
      response.setBody('test');
      response.flushToExpress();

      expect(mockExpressRes.status).toHaveBeenCalledWith(200);
      expect(mockExpressRes.send).toHaveBeenCalledWith('test');
    });
  });
});
