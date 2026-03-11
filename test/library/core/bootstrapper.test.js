const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const Bootstrapper = require(path.join(projectRoot, 'library/core/bootstrapper'));

describe('Bootstrapper', () => {
  let bs;

  beforeEach(() => {
    bs = new Bootstrapper();
  });

  describe('serviceManager', () => {
    it('should get/set serviceManager', () => {
      const sm = { get: jest.fn() };
      bs.setServiceManager(sm);
      expect(bs.getServiceManager()).toBe(sm);
    });

    it('should default to null', () => {
      expect(bs.getServiceManager()).toBeNull();
    });
  });

  describe('routes', () => {
    it('should set and get routes', () => {
      const routes = { home: { route: '/' } };
      bs.setRoutes(routes);
      expect(bs.getRoutes()).toBe(routes);
    });

    it('should load routes from config', () => {
      const routes = { home: { route: '/' } };
      bs.setServiceManager({
        get: jest.fn().mockReturnValue({ router: { routes } })
      });
      expect(bs.getRoutes()).toEqual(routes);
    });

    it('should return null when no routes', () => {
      expect(bs.getRoutes()).toBeNull();
    });

    it('should return null when config has no router', () => {
      bs.setServiceManager({ get: jest.fn().mockReturnValue({}) });
      expect(bs.getRoutes()).toBeNull();
    });
  });

  describe('getConfig', () => {
    it('should return config from SM', () => {
      const config = { key: 'value' };
      bs.setServiceManager({ get: jest.fn().mockReturnValue(config) });
      expect(bs.getConfig()).toBe(config);
    });

    it('should return empty object when no SM', () => {
      expect(bs.getConfig()).toEqual({});
    });

    it('should fallback to sm.config when get throws', () => {
      bs.setServiceManager({
        get: jest.fn().mockImplementation(() => { throw new Error('no'); }),
        config: { fallback: true }
      });
      expect(bs.getConfig()).toEqual({ fallback: true });
    });
  });

  describe('getDelimiter', () => {
    it('should return default delimiter', () => {
      expect(bs.getDelimiter()).toBe('_');
    });
  });

  describe('getResources', () => {
    it('should return init* methods', () => {
      bs.initFoo = () => {};
      bs.initBar = () => {};
      bs.notInit = () => {};
      const resources = bs.getResources();
      expect(resources).toContain('initFoo');
      expect(resources).toContain('initBar');
      expect(resources).not.toContain('notInit');
    });
  });

  describe('_executeResources', () => {
    it('should call resource method', () => {
      bs.initTest = jest.fn();
      bs.getClassResources(bs);
      bs._executeResources('initTest');
      expect(bs.initTest).toHaveBeenCalled();
    });

    it('should not throw for non-existent resource', () => {
      bs.getClassResources(bs);
      expect(() => bs._executeResources('nonExistent')).not.toThrow();
    });
  });

  describe('match', () => {
    it('should match route by path', () => {
      bs.setRoutes({
        home: { route: '/', module: 'blog', controller: 'index', action: 'index' },
        about: { route: '/about', module: 'blog', controller: 'index', action: 'about' }
      });
      const result = bs.match('/');
      expect(result).toBeDefined();
      expect(result.routeName).toBe('home');
    });

    it('should return null for no match', () => {
      bs.setRoutes({ home: { route: '/' } });
      expect(bs.match('/nonexistent')).toBeNull();
    });

    it('should return null when no routes set', () => {
      expect(bs.match('/')).toBeNull();
    });

    it('should return last matching route', () => {
      bs.setRoutes({
        first: { route: '/path' },
        second: { route: '/path' }
      });
      const result = bs.match('/path');
      expect(result.routeName).toBe('second');
    });
  });

  describe('_resolveRouteInfo', () => {
    it('should resolve from route path', () => {
      bs.setRoutes({
        home: { route: '/', module: 'blog', controller: 'index', action: 'list' }
      });
      const req = { route: { path: '/' }, params: {} };
      const result = bs._resolveRouteInfo(req);
      expect(result.module).toBe('blog');
      expect(result.controller).toBe('index');
      expect(result.action).toBe('list');
    });

    it('should resolve from req.module/controller/action', () => {
      const req = { module: 'admin', controller: 'post', action: 'edit' };
      const result = bs._resolveRouteInfo(req);
      expect(result.module).toBe('admin');
    });

    it('should default to error module', () => {
      const result = bs._resolveRouteInfo({});
      expect(result.module).toBe('error');
      expect(result.controller).toBe('index');
      expect(result.action).toBe('notfound');
    });

    it('should default module to "default" when undefined', () => {
      bs.setRoutes({
        test: { route: '/test', controller: 'index', action: 'list' }
      });
      const req = { route: { path: '/test' }, params: {} };
      const result = bs._resolveRouteInfo(req);
      expect(result.module).toBe('default');
    });
  });

  describe('resolveErrorTemplate', () => {
    it('should resolve 404 template from config', () => {
      bs.setServiceManager({
        get: jest.fn().mockReturnValue({
          view_manager: {
            not_found_template: 'error/404',
            template_map: { 'error/404': path.join(projectRoot, 'view/error/404.njk') }
          }
        })
      });

      // Only works if file exists
      const fs = require('node:fs');
      const spy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const result = bs.resolveErrorTemplate('404');
      expect(result.templateKey).toBe('error/404');
      spy.mockRestore();
    });

    it('should resolve 500 template from config', () => {
      bs.setServiceManager({
        get: jest.fn().mockReturnValue({
          view_manager: {
            exception_template: 'error/500',
            template_map: { 'error/500': '/path/to/500.njk' }
          }
        })
      });

      const fs = require('node:fs');
      const spy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const result = bs.resolveErrorTemplate('500');
      expect(result.templateKey).toBe('error/500');
      spy.mockRestore();
    });

    it('should throw if template file not found', () => {
      const fs = require('node:fs');
      const spy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      expect(() => bs.resolveErrorTemplate('404')).toThrow('template not found');
      spy.mockRestore();
    });

    it('should use fallback for custom error type', () => {
      bs.setServiceManager({
        get: jest.fn().mockReturnValue({
          view_manager: { template_map: {} }
        })
      });

      const fs = require('node:fs');
      const spy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const result = bs.resolveErrorTemplate('403');
      expect(result.templateKey).toBe('error/403');
      spy.mockRestore();
    });
  });

  describe('_handleFrameworkResponse', () => {
    let mockRes;

    beforeEach(() => {
      mockRes = {
        end: jest.fn(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
        setHeader: jest.fn(),
        redirect: jest.fn()
      };
    });

    it('should return false when no render, no body, no headers', () => {
      const front = { isNoRender: () => false };
      const response = { hasBody: false, canSendHeaders: () => false };
      expect(bs._handleFrameworkResponse(mockRes, response, front)).toBe(false);
    });

    it('should handle noRender with no response', () => {
      const front = { isNoRender: () => true };
      expect(bs._handleFrameworkResponse(mockRes, null, front)).toBe(true);
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('should redirect when response is redirect', () => {
      const front = { isNoRender: () => true };
      const response = {
        hasBody: false,
        canSendHeaders: () => true,
        getHeaders: () => ({ Location: '/new-url' }),
        isRedirect: () => true,
        getHeader: (key) => key === 'Location' ? '/new-url' : null,
        getHttpResponseCode: () => 302
      };
      bs._handleFrameworkResponse(mockRes, response, front);
      expect(mockRes.redirect).toHaveBeenCalledWith('/new-url');
    });

    it('should send body when available', () => {
      const front = { isNoRender: () => true };
      const response = {
        hasBody: true,
        body: '{"ok":true}',
        canSendHeaders: () => false,
        getHeaders: () => ({}),
        isRedirect: () => false,
        getHttpResponseCode: () => 200
      };
      bs._handleFrameworkResponse(mockRes, response, front);
      expect(mockRes.send).toHaveBeenCalledWith('{"ok":true}');
    });

    it('should end when body is empty', () => {
      const front = { isNoRender: () => true };
      const response = {
        hasBody: true,
        body: '',
        canSendHeaders: () => false,
        getHeaders: () => ({}),
        isRedirect: () => false,
        getHttpResponseCode: () => 204
      };
      bs._handleFrameworkResponse(mockRes, response, front);
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('should end when no body flag', () => {
      const front = { isNoRender: () => true };
      const response = {
        hasBody: false,
        canSendHeaders: () => true,
        getHeaders: () => ({}),
        isRedirect: () => false,
        getHttpResponseCode: () => 200
      };
      bs._handleFrameworkResponse(mockRes, response, front);
      expect(mockRes.end).toHaveBeenCalled();
    });
  });

  describe('_applyResponseHeaders', () => {
    it('should apply headers from response', () => {
      const mockRes = { setHeader: jest.fn() };
      const frameworkResponse = {
        getHeaders: () => ({ 'Content-Type': 'application/json', 'X-Custom': 'val' })
      };
      bs._applyResponseHeaders(mockRes, frameworkResponse);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Custom', 'val');
    });

    it('should skip when no getHeaders method', () => {
      const mockRes = { setHeader: jest.fn() };
      bs._applyResponseHeaders(mockRes, {});
      expect(mockRes.setHeader).not.toHaveBeenCalled();
    });
  });

  describe('_applyResponseStatus', () => {
    it('should set status code', () => {
      const mockRes = { status: jest.fn() };
      bs._applyResponseStatus(mockRes, { getHttpResponseCode: () => 201 });
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('_triggerErrorEvents', () => {
    it('should trigger error events', () => {
      const event = {
        setError: jest.fn(),
        setException: jest.fn()
      };
      const em = { trigger: jest.fn() };
      const error = new Error('test');
      bs._triggerErrorEvents(em, event, error);
      expect(event.setError).toHaveBeenCalledWith(error);
      expect(event.setException).toHaveBeenCalledWith(error);
      expect(em.trigger).toHaveBeenCalledWith('error', event);
    });

    it('should not throw when event/em are null', () => {
      expect(() => bs._triggerErrorEvents(null, null, new Error())).not.toThrow();
    });
  });

  describe('_sendErrorResponse', () => {
    it('should render error template', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn(),
        send: jest.fn()
      };
      const fs = require('node:fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      bs._sendErrorResponse(mockRes, new Error('test'));
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.render).toHaveBeenCalled();

      fs.existsSync.mockRestore();
    });

    it('should fallback to plain text on render error', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn().mockImplementation(() => { throw new Error('render fail'); }),
        send: jest.fn()
      };
      const fs = require('node:fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      bs._sendErrorResponse(mockRes, new Error('test'));
      expect(mockRes.send).toHaveBeenCalledWith('500 - Internal Server Error');

      fs.existsSync.mockRestore();
    });
  });

  describe('dispatcher', () => {
    it('should reject invalid HTTP methods', async () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        send: jest.fn()
      };
      await bs.dispatcher({ method: 'INVALID' }, mockRes, jest.fn());
      expect(mockRes.status).toHaveBeenCalledWith(405);
    });
  });

  describe('_buildController', () => {
    it('should return null if controller is not a BaseController instance', () => {
      const BaseController = require(path.join(projectRoot, 'library/mvc/controller/base-controller'));

      class MockFakeController {}
      const controllerPath = globalThis.applicationPath('/application/module/default/controller/fake-controller');
      jest.doMock(controllerPath, () => MockFakeController, { virtual: true });

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        send: jest.fn()
      };

      bs.serviceManager = null;
      const result = bs._buildController('default', 'fake', mockRes);
      expect(result).toBeNull();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      jest.dontMock(controllerPath);
    });

    it('should return front and requestSm for valid BaseController', () => {
      const BaseController = require(path.join(projectRoot, 'library/mvc/controller/base-controller'));

      class MockValidController extends BaseController {}
      const controllerPath = globalThis.applicationPath('/application/module/default/controller/valid-controller');
      jest.doMock(controllerPath, () => MockValidController, { virtual: true });

      const mockRes = {};
      bs.serviceManager = null;
      const result = bs._buildController('default', 'valid', mockRes);
      expect(result).not.toBeNull();
      expect(result.front).toBeInstanceOf(BaseController);
      jest.dontMock(controllerPath);
    });

    it('should create request scope when SM supports it', () => {
      const BaseController = require(path.join(projectRoot, 'library/mvc/controller/base-controller'));

      class MockScopedController extends BaseController {}
      const controllerPath = globalThis.applicationPath('/application/module/default/controller/scoped-controller');
      jest.doMock(controllerPath, () => MockScopedController, { virtual: true });

      const childSm = { child: true };
      const rootSm = { createRequestScope: jest.fn(() => childSm) };
      bs.serviceManager = rootSm;
      const result = bs._buildController('default', 'scoped', {});
      expect(rootSm.createRequestScope).toHaveBeenCalled();
      expect(result.requestSm).toBe(childSm);
      jest.dontMock(controllerPath);
    });
  });

  describe('_setupRequestContext', () => {
    it('should create request, routeMatch, response and trigger lifecycle events', () => {
      const triggerFn = jest.fn();
      const mockEvent = {
        setRequest: jest.fn(),
        setResponse: jest.fn(),
        setRouteMatch: jest.fn(),
        setDispatched: jest.fn()
      };
      const mockSm = {
        get: jest.fn((name) => {
          if (name === 'MvcEvent') return mockEvent;
          if (name === 'EventManager') return { trigger: triggerFn };
          return null;
        })
      };
      const front = {
        getServiceManager: () => mockSm,
        setEvent: jest.fn()
      };
      const req = { params: { id: '1' }, routeName: 'test', on: jest.fn() };

      const result = bs._setupRequestContext(req, front, 'default', 'index', 'listAction', mockSm);
      expect(result.request).toBeDefined();
      expect(result.routeMatch).toBeDefined();
      expect(result.response).toBeDefined();
      expect(mockEvent.setRequest).toHaveBeenCalled();
      expect(mockEvent.setResponse).toHaveBeenCalled();
      expect(mockEvent.setRouteMatch).toHaveBeenCalled();
      expect(mockEvent.setDispatched).toHaveBeenCalledWith(true);
      expect(front.setEvent).toHaveBeenCalledWith(mockEvent);
      expect(triggerFn).toHaveBeenCalledWith('route', mockEvent);
      expect(triggerFn).toHaveBeenCalledWith('dispatch.pre', mockEvent);
    });
  });

  describe('_executeDispatch', () => {
    it('should return view on success', async () => {
      const view = { template: 'test' };
      const front = { dispatch: jest.fn().mockResolvedValue(view) };
      const em = { trigger: jest.fn() };
      const event = { setResult: jest.fn() };

      const result = await bs._executeDispatch({}, front, em, event);
      expect(result.view).toBe(view);
      expect(result.handled).toBe(false);
      expect(event.setResult).toHaveBeenCalledWith(view);
      expect(em.trigger).toHaveBeenCalledWith('dispatch.post', event);
    });

    it('should handle dispatch errors', async () => {
      const error = new Error('dispatch fail');
      const front = { dispatch: jest.fn().mockRejectedValue(error) };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn(),
        send: jest.fn()
      };

      jest.spyOn(console, 'error').mockImplementation(() => {});
      const fs = require('node:fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      const result = await bs._executeDispatch(mockRes, front, null, null);
      expect(result.handled).toBe(true);
      expect(result.view).toBeNull();

      console.error.mockRestore();
      fs.existsSync.mockRestore();
    });
  });

  describe('_renderView', () => {
    it('should render view with status code from variable', () => {
      const view = {
        getVariable: jest.fn((key) => key === '_status' ? 403 : null),
        getTemplate: jest.fn(() => 'test.njk'),
        getVariables: jest.fn(() => ({ title: 'Test' }))
      };
      const front = {
        prepareFlashMessenger: jest.fn(),
        isNoRender: jest.fn(() => false)
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        setHeader: jest.fn(),
        getHeader: jest.fn(() => null),
        render: jest.fn()
      };
      const em = { trigger: jest.fn() };
      const event = {};

      bs._renderView(mockRes, view, front, {}, em, event);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.render).toHaveBeenCalled();
      expect(em.trigger).toHaveBeenCalledWith('render', event);
      expect(em.trigger).toHaveBeenCalledWith('finish', event);
    });

    it('should set 404 status when req._is404 is true', () => {
      const view = {
        getVariable: jest.fn(() => null),
        getTemplate: jest.fn(() => 'test.njk'),
        getVariables: jest.fn(() => ({}))
      };
      const front = { prepareFlashMessenger: jest.fn() };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        setHeader: jest.fn(),
        getHeader: jest.fn(() => null),
        render: jest.fn()
      };

      bs._renderView(mockRes, view, front, { _is404: true }, null, null);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should set Cache-Control header when not already set', () => {
      const view = {
        getVariable: jest.fn(() => null),
        getTemplate: jest.fn(() => 'test.njk'),
        getVariables: jest.fn(() => ({}))
      };
      const front = { prepareFlashMessenger: jest.fn() };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        setHeader: jest.fn(),
        getHeader: jest.fn(() => null),
        render: jest.fn()
      };

      bs._renderView(mockRes, view, front, {}, null, null);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
    });
  });

  describe('dispatcher full flow', () => {
    it('should handle full GET dispatch with view rendering', async () => {
      const mockView = {
        getVariable: jest.fn(() => null),
        getTemplate: jest.fn(() => 'test.njk'),
        getVariables: jest.fn(() => ({}))
      };
      const mockFront = {
        dispatch: jest.fn().mockResolvedValue(mockView),
        prepareFlashMessenger: jest.fn(),
        isNoRender: jest.fn(() => false),
        indexAction: function() {}
      };

      // Stub _buildController to return our mock
      jest.spyOn(bs, '_buildController').mockReturnValue({ front: mockFront, requestSm: null });

      bs.setRoutes({
        home: { route: '/', module: 'blog', controller: 'index', action: 'index' }
      });

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        setHeader: jest.fn(),
        getHeader: jest.fn(() => null),
        render: jest.fn(),
        headersSent: false
      };
      const req = { method: 'GET', route: { path: '/' }, params: {}, on: jest.fn() };
      await bs.dispatcher(req, mockRes, jest.fn());
      expect(mockRes.render).toHaveBeenCalled();
      bs._buildController.mockRestore();
    });

    it('should use notFoundAction when action not found on controller', async () => {
      const mockView = {
        getVariable: jest.fn(() => null),
        getTemplate: jest.fn(() => '404.njk'),
        getVariables: jest.fn(() => ({}))
      };
      const mockFront = {
        dispatch: jest.fn().mockResolvedValue(mockView),
        prepareFlashMessenger: jest.fn(),
        notFoundAction: function() {}
      };

      jest.spyOn(bs, '_buildController').mockReturnValue({ front: mockFront, requestSm: null });

      bs.setRoutes({
        detail: { route: '/detail', module: 'blog', controller: 'post', action: 'nonexistentMethod' }
      });

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        setHeader: jest.fn(),
        getHeader: jest.fn(() => null),
        render: jest.fn(),
        headersSent: false
      };
      const req = { method: 'GET', route: { path: '/detail' }, params: {}, on: jest.fn() };
      await bs.dispatcher(req, mockRes, jest.fn());
      expect(req._is404).toBe(true);
      bs._buildController.mockRestore();
    });

    it('should start session when req.session exists', async () => {
      const mockFront = {
        dispatch: jest.fn().mockResolvedValue(null),
        indexAction: function() {}
      };

      jest.spyOn(bs, '_buildController').mockReturnValue({ front: mockFront, requestSm: null });

      bs.setRoutes({
        sess: { route: '/sess', module: 'blog', controller: 'session', action: 'index' }
      });

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        setHeader: jest.fn(),
        getHeader: jest.fn(() => null),
        render: jest.fn(),
        end: jest.fn(),
        send: jest.fn(),
        headersSent: false
      };
      const req = { method: 'GET', route: { path: '/sess' }, params: {}, session: {}, on: jest.fn() };
      await bs.dispatcher(req, mockRes, jest.fn());
      bs._buildController.mockRestore();
    });

    it('should return early when _buildController returns null', async () => {
      jest.spyOn(bs, '_buildController').mockReturnValue(null);

      bs.setRoutes({
        test: { route: '/test', module: 'blog', controller: 'index', action: 'index' }
      });

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        send: jest.fn()
      };
      const req = { method: 'GET', route: { path: '/test' }, params: {}, on: jest.fn() };
      await bs.dispatcher(req, mockRes, jest.fn());
      // Should return without rendering or error
      bs._buildController.mockRestore();
    });

    it('should return early when headersSent is true', async () => {
      const mockFront = {
        dispatch: jest.fn().mockResolvedValue({ some: 'view' }),
        indexAction: function() {},
        isNoRender: jest.fn(() => false)
      };
      jest.spyOn(bs, '_buildController').mockReturnValue({ front: mockFront, requestSm: null });

      bs.setRoutes({
        test: { route: '/hdr', module: 'blog', controller: 'index', action: 'index' }
      });

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        setHeader: jest.fn(),
        getHeader: jest.fn(() => null),
        render: jest.fn(),
        headersSent: true // already sent
      };
      const req = { method: 'GET', route: { path: '/hdr' }, params: {}, on: jest.fn() };
      await bs.dispatcher(req, mockRes, jest.fn());
      expect(mockRes.render).not.toHaveBeenCalled();
      bs._buildController.mockRestore();
    });

    it('should handle framework response when controller is noRender', async () => {
      const mockFront = {
        dispatch: jest.fn().mockResolvedValue(null),
        indexAction: function() {},
        isNoRender: jest.fn(() => true)
      };
      jest.spyOn(bs, '_buildController').mockReturnValue({ front: mockFront, requestSm: null });

      bs.setRoutes({
        api: { route: '/api', module: 'blog', controller: 'index', action: 'index' }
      });

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        setHeader: jest.fn(),
        getHeader: jest.fn(() => null),
        render: jest.fn(),
        end: jest.fn(),
        send: jest.fn(),
        headersSent: false
      };
      const req = { method: 'GET', route: { path: '/api' }, params: {}, on: jest.fn() };
      await bs.dispatcher(req, mockRes, jest.fn());
      expect(mockRes.end).toHaveBeenCalled();
      bs._buildController.mockRestore();
    });
  });

  describe('run', () => {
    it('should start server and listen on port', () => {
      const closeFn = jest.fn();
      const listenFn = jest.fn((port, host, cb) => {
        cb();
        return { close: closeFn };
      });

      bs.app = { listen: listenFn };

      const origEnv = process.env.NODE_ENV;
      const origPort = process.env.PORT;
      process.env.NODE_ENV = 'test.local';
      process.env.PORT = '3333';

      jest.spyOn(console, 'log').mockImplementation(() => {});
      bs.run();

      expect(listenFn).toHaveBeenCalledWith('3333', '::', expect.any(Function));
      expect(closeFn).toHaveBeenCalled(); // because NODE_ENV is 'test.local'

      console.log.mockRestore();
      process.env.NODE_ENV = origEnv;
      process.env.PORT = origPort;
    });

    it('should use default port 8080 when PORT not set', () => {
      const listenFn = jest.fn((port, host, cb) => {
        cb();
        return { close: jest.fn() };
      });
      bs.app = { listen: listenFn };

      const origEnv = process.env.NODE_ENV;
      const origPort = process.env.PORT;
      process.env.NODE_ENV = 'test.local';
      delete process.env.PORT;

      jest.spyOn(console, 'log').mockImplementation(() => {});
      bs.run();

      expect(listenFn).toHaveBeenCalledWith(8080, '::', expect.any(Function));

      console.log.mockRestore();
      process.env.NODE_ENV = origEnv;
      if (origPort !== undefined) process.env.PORT = origPort;
    });
  });
});
