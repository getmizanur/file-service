const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const Bootstrapper = require(path.join(projectRoot, 'library/core/bootstrapper'));

describe('Bootstrapper', () => {
  let bootstrapper;

  beforeEach(() => {
    bootstrapper = new Bootstrapper();
  });

  // ---- serviceManager ----
  describe('setServiceManager / getServiceManager', () => {
    it('should set and get service manager', () => {
      const sm = { get: jest.fn() };
      bootstrapper.setServiceManager(sm);
      expect(bootstrapper.getServiceManager()).toBe(sm);
    });

    it('should return null by default', () => {
      expect(bootstrapper.getServiceManager()).toBe(null);
    });

    it('should return this for chaining', () => {
      const result = bootstrapper.setServiceManager({});
      expect(result).toBe(bootstrapper);
    });
  });

  // ---- routes ----
  describe('setRoutes / getRoutes', () => {
    it('should set and get routes', () => {
      const routes = { home: { route: '/' } };
      bootstrapper.setRoutes(routes);
      expect(bootstrapper.getRoutes()).toBe(routes);
    });

    it('should return this for chaining', () => {
      const result = bootstrapper.setRoutes({});
      expect(result).toBe(bootstrapper);
    });

    it('should fall back to config router routes', () => {
      const routes = { about: { route: '/about' } };
      const sm = { get: jest.fn().mockReturnValue({ router: { routes } }) };
      bootstrapper.setServiceManager(sm);
      expect(bootstrapper.getRoutes()).toBe(routes);
    });

    it('should return null if no routes set and no config', () => {
      const sm = { get: jest.fn().mockReturnValue({}) };
      bootstrapper.setServiceManager(sm);
      expect(bootstrapper.getRoutes()).toBe(null);
    });
  });

  // ---- getConfig ----
  describe('getConfig', () => {
    it('should return empty object if no service manager', () => {
      expect(bootstrapper.getConfig()).toEqual({});
    });

    it('should get Config from service manager', () => {
      const config = { app: 'test' };
      const sm = { get: jest.fn().mockReturnValue(config) };
      bootstrapper.setServiceManager(sm);
      expect(bootstrapper.getConfig()).toBe(config);
    });

    it('should fallback to sm.config if sm.get throws', () => {
      const sm = { get: jest.fn().mockImplementation(() => { throw new Error('not found'); }), config: { fallback: true } };
      bootstrapper.setServiceManager(sm);
      expect(bootstrapper.getConfig()).toEqual({ fallback: true });
    });
  });

  // ---- getDelimiter ----
  describe('getDelimiter', () => {
    it('should return underscore by default', () => {
      expect(bootstrapper.getDelimiter()).toBe('_');
    });
  });

  // ---- match ----
  describe('match', () => {
    it('should return null if no routes set', () => {
      expect(bootstrapper.match('/some/path')).toBe(null);
    });

    it('should match a route by path', () => {
      bootstrapper.setRoutes({
        home: { route: '/', module: 'default', controller: 'index', action: 'index' },
        about: { route: '/about', module: 'default', controller: 'page', action: 'about' }
      });

      const result = bootstrapper.match('/about');
      expect(result.module).toBe('default');
      expect(result.controller).toBe('page');
      expect(result.action).toBe('about');
      expect(result.routeName).toBe('about');
    });

    it('should return null if no route matches', () => {
      bootstrapper.setRoutes({ home: { route: '/' } });
      expect(bootstrapper.match('/nonexistent')).toBe(null);
    });

    it('should return the last matching route if multiple match', () => {
      bootstrapper.setRoutes({
        first: { route: '/dup', module: 'a' },
        second: { route: '/dup', module: 'b' }
      });
      const result = bootstrapper.match('/dup');
      expect(result.module).toBe('b');
      expect(result.routeName).toBe('second');
    });
  });

  // ---- _resolveRouteInfo ----
  describe('_resolveRouteInfo', () => {
    it('should use route match when req.route.path is set', () => {
      bootstrapper.setRoutes({
        dashboard: { route: '/dashboard', module: 'admin', controller: 'dashboard', action: 'index' }
      });

      const req = { route: { path: '/dashboard' } };
      const info = bootstrapper._resolveRouteInfo(req);
      expect(info.module).toBe('admin');
      expect(info.controller).toBe('dashboard');
      expect(info.action).toBe('index');
    });

    it('should use req.module/controller/action when no route.path', () => {
      const req = { module: 'api', controller: 'users', action: 'list' };
      const info = bootstrapper._resolveRouteInfo(req);
      expect(info.module).toBe('api');
      expect(info.controller).toBe('users');
      expect(info.action).toBe('list');
    });

    it('should default to error/index/notFound when nothing matches', () => {
      const req = {};
      const info = bootstrapper._resolveRouteInfo(req);
      expect(info.module).toBe('error');
      expect(info.controller).toBe('index');
      expect(info.action).toBe('not-found');
    });

    it('should default module to "default" if route match returns undefined module', () => {
      bootstrapper.setRoutes({
        noModule: { route: '/nomod', controller: 'index', action: 'index' }
      });
      const req = { route: { path: '/nomod' } };
      const info = bootstrapper._resolveRouteInfo(req);
      expect(info.module).toBe('default');
    });
  });

  // ---- getResources / getClassResources ----
  describe('getResources', () => {
    it('should return only methods starting with "init"', () => {
      class TestBootstrapper extends Bootstrapper {
        initRoutes() {}
        initView() {}
        someOtherMethod() {}
      }
      const tb = new TestBootstrapper();
      const resources = tb.getResources();
      expect(resources).toContain('initRoutes');
      expect(resources).toContain('initView');
      expect(resources).not.toContain('someOtherMethod');
    });
  });

  // ---- _executeResources ----
  describe('_executeResources', () => {
    it('should call the named method on classResource', () => {
      const mockFn = jest.fn();
      bootstrapper.classResource = { myMethod: mockFn };
      bootstrapper._executeResources('myMethod');
      expect(mockFn).toHaveBeenCalled();
    });

    it('should not throw if method does not exist', () => {
      bootstrapper.classResource = {};
      expect(() => bootstrapper._executeResources('nonExistent')).not.toThrow();
    });
  });

  // ---- resolveErrorTemplate ----
  describe('resolveErrorTemplate', () => {
    it('should resolve 404 template from config', () => {
      const templatePath = globalThis.applicationPath('/view/error/404.njk');
      const sm = {
        get: jest.fn().mockReturnValue({
          view_manager: {
            not_found_template: 'error/404',
            template_map: { 'error/404': templatePath }
          }
        })
      };
      bootstrapper.setServiceManager(sm);

      // Mock fs.existsSync for template check
      const fs = require('node:fs');
      const originalExists = fs.existsSync;
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      try {
        const result = bootstrapper.resolveErrorTemplate('404');
        expect(result.templatePath).toBe(templatePath);
        expect(result.templateKey).toBe('error/404');
      } finally {
        fs.existsSync.mockRestore();
      }
    });

    it('should resolve 500 template from config', () => {
      const templatePath = globalThis.applicationPath('/view/error/500.njk');
      const sm = {
        get: jest.fn().mockReturnValue({
          view_manager: {
            exception_template: 'error/500',
            template_map: { 'error/500': templatePath }
          }
        })
      };
      bootstrapper.setServiceManager(sm);

      const fs = require('node:fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      try {
        const result = bootstrapper.resolveErrorTemplate('500');
        expect(result.templatePath).toBe(templatePath);
        expect(result.templateKey).toBe('error/500');
      } finally {
        fs.existsSync.mockRestore();
      }
    });

    it('should fall back to default template path', () => {
      const fs = require('node:fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      try {
        const result = bootstrapper.resolveErrorTemplate('403');
        expect(result.templatePath).toBe(globalThis.applicationPath('/view/error/403.njk'));
        expect(result.templateKey).toBe('error/403');
      } finally {
        fs.existsSync.mockRestore();
      }
    });

    it('should throw if template file does not exist', () => {
      const fs = require('node:fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      try {
        expect(() => bootstrapper.resolveErrorTemplate('404')).toThrow('Error 404 template not found');
      } finally {
        fs.existsSync.mockRestore();
      }
    });
  });

  // ---- _handleFrameworkResponse ----
  describe('_handleFrameworkResponse', () => {
    it('should return false when controller is not noRender and response has no body', () => {
      const res = {};
      const front = { isNoRender: () => false };
      const response = { hasBody: false, canSendHeaders: () => false };
      expect(bootstrapper._handleFrameworkResponse(res, response, front)).toBe(false);
    });

    it('should end response when noRender and no frameworkResponse', () => {
      const res = { end: jest.fn(), setHeader: jest.fn(), status: jest.fn() };
      const front = { isNoRender: () => true };
      const result = bootstrapper._handleFrameworkResponse(res, null, front);
      expect(result).toBe(true);
      expect(res.end).toHaveBeenCalled();
    });

    it('should handle redirect response', () => {
      const res = {
        setHeader: jest.fn(),
        status: jest.fn(),
        redirect: jest.fn()
      };
      const front = { isNoRender: () => true };
      const response = {
        hasBody: false,
        canSendHeaders: () => true,
        getHeaders: () => ({ Location: '/new-url' }),
        getHttpResponseCode: () => 302,
        isRedirect: () => true,
        getHeader: (h) => '/new-url'
      };
      const result = bootstrapper._handleFrameworkResponse(res, response, front);
      expect(result).toBe(true);
      expect(res.redirect).toHaveBeenCalledWith('/new-url');
    });

    it('should send body when response has body', () => {
      const res = {
        setHeader: jest.fn(),
        status: jest.fn(),
        send: jest.fn()
      };
      const front = { isNoRender: () => false };
      const response = {
        hasBody: true,
        body: '<html>test</html>',
        canSendHeaders: () => true,
        getHeaders: () => ({ 'Content-Type': 'text/html' }),
        getHttpResponseCode: () => 200,
        isRedirect: () => false
      };
      const result = bootstrapper._handleFrameworkResponse(res, response, front);
      expect(result).toBe(true);
      expect(res.send).toHaveBeenCalledWith('<html>test</html>');
    });

    it('should end response when body is empty', () => {
      const res = {
        setHeader: jest.fn(),
        status: jest.fn(),
        end: jest.fn()
      };
      const front = { isNoRender: () => false };
      const response = {
        hasBody: true,
        body: '',
        canSendHeaders: () => true,
        getHeaders: () => ({}),
        getHttpResponseCode: () => 204,
        isRedirect: () => false
      };
      bootstrapper._handleFrameworkResponse(res, response, front);
      expect(res.end).toHaveBeenCalled();
    });
  });

  // ---- _sendErrorResponse ----
  describe('_sendErrorResponse', () => {
    it('should render error template on 500', () => {
      const fs = require('node:fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      const res = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn(),
        send: jest.fn()
      };

      try {
        bootstrapper._sendErrorResponse(res, new Error('boom'));
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.render).toHaveBeenCalled();
      } finally {
        fs.existsSync.mockRestore();
      }
    });

    it('should fallback to plain text on render failure', () => {
      const fs = require('node:fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      const res = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn(),
        send: jest.fn().mockReturnThis()
      };

      try {
        bootstrapper._sendErrorResponse(res, new Error('boom'));
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith('500 - Internal Server Error');
      } finally {
        fs.existsSync.mockRestore();
      }
    });
  });

  // ---- _triggerErrorEvents ----
  describe('_triggerErrorEvents', () => {
    it('should set error and trigger error event', () => {
      const event = { setError: jest.fn(), setException: jest.fn() };
      const em = { trigger: jest.fn() };
      bootstrapper._triggerErrorEvents(em, event, new Error('test'));
      expect(event.setError).toHaveBeenCalled();
      expect(event.setException).toHaveBeenCalled();
      expect(em.trigger).toHaveBeenCalledWith('error', event);
    });

    it('should not throw if event or em is null', () => {
      expect(() => bootstrapper._triggerErrorEvents(null, null, new Error('test'))).not.toThrow();
    });
  });

  // ---- dispatcher (method validation) ----
  describe('dispatcher', () => {
    it('should reject invalid HTTP method with 405', async () => {
      const req = { method: 'TRACE' };
      const res = {
        status: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis()
      };
      const next = jest.fn();

      await bootstrapper.dispatcher(req, res, next);
      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.send).toHaveBeenCalledWith('Method Not Allowed');
    });
  });

  // ---- _applyResponseHeaders / _applyResponseStatus ----
  describe('_applyResponseHeaders', () => {
    it('should set headers from framework response', () => {
      const res = { setHeader: jest.fn() };
      const response = { getHeaders: () => ({ 'X-Custom': 'value' }) };
      bootstrapper._applyResponseHeaders(res, response);
      expect(res.setHeader).toHaveBeenCalledWith('X-Custom', 'value');
    });

    it('should do nothing if getHeaders is not a function', () => {
      const res = { setHeader: jest.fn() };
      bootstrapper._applyResponseHeaders(res, {});
      expect(res.setHeader).not.toHaveBeenCalled();
    });
  });

  describe('_applyResponseStatus', () => {
    it('should set status code', () => {
      const res = { status: jest.fn() };
      const response = { getHttpResponseCode: () => 201 };
      bootstrapper._applyResponseStatus(res, response);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ---- _sendResponseBody ----
  describe('_sendResponseBody', () => {
    it('should send body when present', () => {
      const res = { send: jest.fn(), end: jest.fn() };
      bootstrapper._sendResponseBody(res, { hasBody: true, body: 'content' });
      expect(res.send).toHaveBeenCalledWith('content');
    });

    it('should end when body is null', () => {
      const res = { send: jest.fn(), end: jest.fn() };
      bootstrapper._sendResponseBody(res, { hasBody: true, body: null });
      expect(res.end).toHaveBeenCalled();
    });

    it('should end when no body', () => {
      const res = { send: jest.fn(), end: jest.fn() };
      bootstrapper._sendResponseBody(res, { hasBody: false });
      expect(res.end).toHaveBeenCalled();
    });
  });
});
