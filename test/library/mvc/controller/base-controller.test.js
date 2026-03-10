const BaseController = require('../../../../library/mvc/controller/base-controller');

describe('BaseController', () => {
  let controller;
  let mockServiceManager;
  let mockEvent;
  let mockRequest;
  let mockResponse;
  let mockRouteMatch;

  beforeEach(() => {
    mockRequest = {
      getParam: jest.fn((name, def) => def),
      getParams: jest.fn(() => ({})),
      getQuery: jest.fn((name, def) => def),
      getSession: jest.fn(() => ({ userId: 1 })),
      setSession: jest.fn(),
      params: {},
      query: {},
      session: {},
    };

    mockResponse = {
      setHeader: jest.fn(),
      setHttpResponseCode: jest.fn(),
      setBody: jest.fn(),
      getHeader: jest.fn(() => null),
      canSendHeaders: jest.fn(),
      json: jest.fn(),
      body: null,
      hasBody: false,
    };

    mockRouteMatch = {
      getModule: jest.fn(() => 'file'),
      getController: jest.fn(() => 'file'),
      getAction: jest.fn(() => 'indexAction'),
      getRouteName: jest.fn(() => 'file/index'),
    };

    mockEvent = {
      getRequest: jest.fn(() => mockRequest),
      getResponse: jest.fn(() => mockResponse),
      getRouteMatch: jest.fn(() => mockRouteMatch),
      isDispatched: jest.fn(() => true),
      setDispatched: jest.fn(),
    };

    mockServiceManager = {
      get: jest.fn((name) => {
        if (name === 'Config') return { appName: 'test' };
        if (name === 'Application') return {
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        };
        return null;
      }),
      has: jest.fn(() => false),
      setController: jest.fn(),
    };

    controller = new BaseController({ serviceManager: mockServiceManager });
    controller.setEvent(mockEvent);
  });

  describe('constructor', () => {
    it('sets serviceManager from options', () => {
      expect(controller.getServiceManager()).toBe(mockServiceManager);
    });

    it('calls setController on serviceManager if available', () => {
      expect(mockServiceManager.setController).toHaveBeenCalledWith(controller);
    });

    it('defaults to null when no options', () => {
      const ctrl = new BaseController();
      expect(ctrl.event).toBeNull();
      expect(ctrl.noRender).toBe(false);
    });

    it('handles serviceManager without setController', () => {
      const sm = { get: jest.fn(), has: jest.fn() };
      expect(() => new BaseController({ serviceManager: sm })).not.toThrow();
    });
  });

  describe('setServiceManager / getServiceManager / getSm', () => {
    it('sets and gets the service manager', () => {
      const sm = { get: jest.fn(), has: jest.fn(), setController: jest.fn() };
      controller.setServiceManager(sm);
      expect(controller.getServiceManager()).toBe(sm);
    });

    it('returns this for chaining', () => {
      expect(controller.setServiceManager(mockServiceManager)).toBe(controller);
    });

    it('throws when serviceManager not set', () => {
      const ctrl = new BaseController();
      expect(() => ctrl.getServiceManager()).toThrow('ServiceManager not injected into Controller');
    });
  });

  describe('setEvent / getEvent', () => {
    it('sets and gets the event', () => {
      expect(controller.getEvent()).toBe(mockEvent);
    });

    it('returns this for chaining', () => {
      expect(controller.setEvent(mockEvent)).toBe(controller);
    });
  });

  describe('getRequest', () => {
    it('returns request from event', () => {
      expect(controller.getRequest()).toBe(mockRequest);
    });

    it('falls back to Application service when event has no request', () => {
      mockEvent.getRequest.mockReturnValue(null);
      const result = controller.getRequest();
      expect(result).toBe(mockRequest); // from Application fallback
    });
  });

  describe('getResponse', () => {
    it('returns response from event', () => {
      expect(controller.getResponse()).toBe(mockResponse);
    });

    it('falls back to Application service when event has no response', () => {
      mockEvent.getResponse.mockReturnValue(null);
      const result = controller.getResponse();
      expect(result).toBe(mockResponse); // from Application fallback
    });
  });

  describe('getRouteMatch', () => {
    it('returns routeMatch from event', () => {
      expect(controller.getRouteMatch()).toBe(mockRouteMatch);
    });

    it('returns null when no event', () => {
      controller.setEvent(null);
      expect(controller.getRouteMatch()).toBeNull();
    });

    it('returns null when event has no getRouteMatch', () => {
      controller.setEvent({});
      expect(controller.getRouteMatch()).toBeNull();
    });
  });

  describe('getParam / getAllParams / getQuery', () => {
    it('getParam delegates to request.getParam', () => {
      mockRequest.getParam.mockReturnValue('val');
      expect(controller.getParam('id')).toBe('val');
      expect(mockRequest.getParam).toHaveBeenCalledWith('id', null);
    });

    it('getParam returns defaultValue when no request', () => {
      mockEvent.getRequest.mockReturnValue(null);
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'Application') return { getRequest: () => null };
        return null;
      });
      expect(controller.getParam('id', 'default')).toBe('default');
    });

    it('getParam falls back to params object for legacy', () => {
      const legacyReq = { params: { id: '42' } };
      mockEvent.getRequest.mockReturnValue(legacyReq);
      expect(controller.getParam('id')).toBe('42');
    });

    it('getAllParams delegates to request.getParams', () => {
      mockRequest.getParams.mockReturnValue({ a: 1, b: 2 });
      expect(controller.getAllParams()).toEqual({ a: 1, b: 2 });
    });

    it('getAllParams returns empty object when no request', () => {
      mockEvent.getRequest.mockReturnValue(null);
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'Application') return { getRequest: () => null };
        return null;
      });
      expect(controller.getAllParams()).toEqual({});
    });

    it('getQuery delegates to request.getQuery', () => {
      mockRequest.getQuery.mockReturnValue('search-term');
      expect(controller.getQuery('q')).toBe('search-term');
    });

    it('getQuery falls back to query object for legacy', () => {
      const legacyReq = { query: { q: 'hello' } };
      mockEvent.getRequest.mockReturnValue(legacyReq);
      expect(controller.getQuery('q')).toBe('hello');
    });

    it('getQuery returns default for missing key in legacy', () => {
      const legacyReq = { query: {} };
      mockEvent.getRequest.mockReturnValue(legacyReq);
      expect(controller.getQuery('missing', 'def')).toBe('def');
    });
  });

  describe('getSession / setSession', () => {
    it('getSession delegates to request.getSession', () => {
      expect(controller.getSession()).toEqual({ userId: 1 });
    });

    it('getSession falls back to req.session for legacy', () => {
      const legacyReq = { session: { token: 'abc' } };
      mockEvent.getRequest.mockReturnValue(legacyReq);
      expect(controller.getSession()).toEqual({ token: 'abc' });
    });

    it('setSession delegates to request.setSession', () => {
      controller.setSession({ userId: 2 });
      expect(mockRequest.setSession).toHaveBeenCalledWith({ userId: 2 });
    });

    it('setSession falls back to setting req.session for legacy', () => {
      const legacyReq = { session: null };
      mockEvent.getRequest.mockReturnValue(legacyReq);
      controller.setSession({ token: 'xyz' });
      expect(legacyReq.session).toEqual({ token: 'xyz' });
    });

    it('setSession returns this for chaining', () => {
      expect(controller.setSession({})).toBe(controller);
    });
  });

  describe('setView / getView', () => {
    it('setView stores view model', () => {
      const vm = { setTemplate: jest.fn() };
      controller.setView(vm);
      expect(controller.getView()).toBe(vm);
    });

    it('getView creates a new ViewModel when none set', () => {
      // Need to mock plugin('layout') for getViewScript
      const mockPluginManager = {
        get: jest.fn(() => ({ getTemplate: () => 'default.njk' })),
        setController: jest.fn(),
      };
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'PluginManager') return mockPluginManager;
        return null;
      });

      controller.model = null;
      const view = controller.getView();
      expect(view).toBeDefined();
      expect(view.getTemplate()).toBe('default.njk');
    });
  });

  describe('setHeader / setStatus / setBody', () => {
    it('setHeader delegates to response', () => {
      controller.setHeader('X-Custom', 'value');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Custom', 'value', true);
    });

    it('setHeader returns this for chaining', () => {
      expect(controller.setHeader('X-Test', 'v')).toBe(controller);
    });

    it('setStatus delegates to response.setHttpResponseCode', () => {
      controller.setStatus(404);
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(404);
    });

    it('setStatus returns this for chaining', () => {
      expect(controller.setStatus(200)).toBe(controller);
    });

    it('setBody uses response.setBody when available', () => {
      controller.setBody('content');
      expect(mockResponse.setBody).toHaveBeenCalledWith('content');
    });

    it('setBody falls back to body property for legacy', () => {
      const legacyRes = { canSendHeaders: jest.fn() };
      mockEvent.getResponse.mockReturnValue(legacyRes);
      controller.setBody('legacy-body');
      expect(legacyRes.body).toBe('legacy-body');
      expect(legacyRes.hasBody).toBe(true);
    });

    it('setBody returns this for chaining', () => {
      expect(controller.setBody('')).toBe(controller);
    });
  });

  describe('json(payload, status, headers)', () => {
    it('sets noRender to true', () => {
      controller.json({ ok: true });
      expect(controller.isNoRender()).toBe(true);
    });

    it('sets status code', () => {
      controller.json({ ok: true }, 201);
      expect(mockResponse.setHttpResponseCode).toHaveBeenCalledWith(201);
    });

    it('sets Content-Type header when not already set', () => {
      controller.json({ ok: true });
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type', 'application/json; charset=utf-8', true
      );
    });

    it('does not override existing Content-Type', () => {
      mockResponse.getHeader.mockReturnValue('text/plain');
      controller.json({ ok: true });
      const contentTypeCalls = mockResponse.setHeader.mock.calls.filter(
        c => c[0] === 'Content-Type'
      );
      expect(contentTypeCalls).toHaveLength(0);
    });

    it('sets additional headers', () => {
      controller.json({ ok: true }, 200, { 'X-Custom': 'val' });
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Custom', 'val', true);
    });

    it('uses response.json when available', () => {
      controller.json({ data: 1 }, 200, {});
      expect(mockResponse.json).toHaveBeenCalledWith({ data: 1 }, 200, {});
    });

    it('falls back to setBody with JSON.stringify when response.json not available', () => {
      delete mockResponse.json;
      controller.json({ data: 1 });
      expect(mockResponse.setBody).toHaveBeenCalledWith(JSON.stringify({ data: 1 }));
    });

    it('returns this for chaining', () => {
      expect(controller.json({})).toBe(controller);
    });
  });

  describe('setNoRender / isNoRender', () => {
    it('defaults to false', () => {
      expect(controller.isNoRender()).toBe(false);
    });

    it('sets noRender flag', () => {
      controller.setNoRender(true);
      expect(controller.isNoRender()).toBe(true);
    });

    it('coerces to boolean', () => {
      controller.setNoRender(1);
      expect(controller.isNoRender()).toBe(true);
      controller.setNoRender(0);
      expect(controller.isNoRender()).toBe(false);
    });

    it('defaults to true when no argument', () => {
      controller.setNoRender();
      expect(controller.isNoRender()).toBe(true);
    });

    it('returns this for chaining', () => {
      expect(controller.setNoRender(true)).toBe(controller);
    });
  });

  describe('getConfig', () => {
    it('gets Config from service manager', () => {
      const config = controller.getConfig();
      expect(mockServiceManager.get).toHaveBeenCalledWith('Config');
      expect(config).toEqual({ appName: 'test' });
    });
  });

  describe('notFoundAction / serverErrorAction', () => {
    let mockViewManager;

    beforeEach(() => {
      mockViewManager = {
        createErrorViewModel: jest.fn((code, message) => ({
          template: `error/${code}.njk`,
          variables: { code, message: message || `Error ${code}` },
        })),
      };
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'ViewManager') return mockViewManager;
        return null;
      });
    });

    it('notFoundAction returns a ViewModel with 404 template', () => {
      const result = controller.notFoundAction();
      expect(result.getTemplate()).toBe('error/404.njk');
      expect(result.getVariable('code')).toBe(404);
    });

    it('serverErrorAction returns a ViewModel with 500 template', () => {
      const result = controller.serverErrorAction();
      expect(result.getTemplate()).toBe('error/500.njk');
      expect(result.getVariable('code')).toBe(500);
    });
  });

  describe('trigger404 / trigger500', () => {
    let mockViewManager;

    beforeEach(() => {
      mockViewManager = {
        createErrorViewModel: jest.fn((code, message) => ({
          template: `error/${code}.njk`,
          variables: { code, message: message || `Error ${code}` },
        })),
      };
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'ViewManager') return mockViewManager;
        return null;
      });
    });

    it('trigger404 creates 404 ViewModel with custom message', () => {
      const result = controller.trigger404('Not found');
      expect(mockViewManager.createErrorViewModel).toHaveBeenCalledWith(404, 'Not found', null);
      expect(result.getTemplate()).toBe('error/404.njk');
    });

    it('trigger500 creates 500 ViewModel with custom message', () => {
      const result = controller.trigger500('Server error');
      expect(mockViewManager.createErrorViewModel).toHaveBeenCalledWith(500, 'Server error', null);
      expect(result.getTemplate()).toBe('error/500.njk');
    });
  });

  describe('dispatch', () => {
    let mockPluginManager;

    beforeEach(() => {
      mockPluginManager = {
        get: jest.fn(() => ({ getTemplate: () => 'layout.njk' })),
        setController: jest.fn(),
      };
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'PluginManager') return mockPluginManager;
        if (name === 'Config') return {};
        return null;
      });
      mockServiceManager.has.mockReturnValue(false);
    });

    it('calls the action method from routeMatch', () => {
      controller.indexAction = jest.fn(() => 'result');
      const result = controller.dispatch();
      expect(controller.indexAction).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('calls preDispatch and postDispatch hooks', () => {
      controller.indexAction = jest.fn(() => 'result');
      const preSpy = jest.spyOn(controller, 'preDispatch');
      const postSpy = jest.spyOn(controller, 'postDispatch');
      controller.dispatch();
      expect(preSpy).toHaveBeenCalled();
      expect(postSpy).toHaveBeenCalled();
    });

    it('handles async action methods', async () => {
      controller.indexAction = jest.fn(async () => 'async-result');
      const result = await controller.dispatch();
      expect(result).toBe('async-result');
    });

    it('short-circuits when preDispatch returns false', () => {
      controller.preDispatch = () => false;
      controller.indexAction = jest.fn();
      const result = controller.dispatch();
      expect(controller.indexAction).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('preDispatch / postDispatch hooks', () => {
    it('preDispatch is a no-op by default', () => {
      expect(controller.preDispatch()).toBeUndefined();
    });

    it('postDispatch is a no-op by default', () => {
      expect(controller.postDispatch()).toBeUndefined();
    });
  });

  describe('delimiter', () => {
    it('getDelimiter / setDelimiter', () => {
      controller.setDelimiter('/');
      expect(controller.getDelimiter()).toBe('/');
    });
  });

  describe('getAllParams legacy fallback (line 247)', () => {
    it('returns req.params when request has no getParams method', () => {
      const legacyReq = { params: { id: '10', name: 'test' } };
      mockEvent.getRequest.mockReturnValue(legacyReq);
      expect(controller.getAllParams()).toEqual({ id: '10', name: 'test' });
    });

    it('returns empty object when legacy req has no params', () => {
      const legacyReq = {};
      mockEvent.getRequest.mockReturnValue(legacyReq);
      expect(controller.getAllParams()).toEqual({});
    });
  });

  describe('prepareFlashMessenger (lines 276-286)', () => {
    it('calls prepareForView on flash messenger plugin', () => {
      const mockFlash = { prepareForView: jest.fn() };
      const mockPluginManager = {
        get: jest.fn(() => mockFlash),
        setController: jest.fn(),
      };
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'PluginManager') return mockPluginManager;
        return null;
      });
      controller.prepareFlashMessenger();
      expect(mockFlash.prepareForView).toHaveBeenCalled();
    });

    it('catches silently when plugin throws', () => {
      const mockPluginManager = {
        get: jest.fn(() => { throw new Error('no plugin'); }),
        setController: jest.fn(),
      };
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'PluginManager') return mockPluginManager;
        return null;
      });
      expect(() => controller.prepareFlashMessenger()).not.toThrow();
    });
  });

  describe('dispatch viewHelperManager.syncToViewModel (line 306)', () => {
    it('calls syncToViewModel when viewHelperManager is set', () => {
      const mockPluginManager = {
        get: jest.fn(() => ({ getTemplate: () => 'layout.njk' })),
        setController: jest.fn(),
      };
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'PluginManager') return mockPluginManager;
        if (name === 'Config') return {};
        return null;
      });
      mockServiceManager.has.mockReturnValue(false);

      controller.viewHelperManager = {
        syncToViewModel: jest.fn(),
      };
      controller.indexAction = jest.fn(() => 'result');
      controller.dispatch();
      expect(controller.viewHelperManager.syncToViewModel).toHaveBeenCalled();
    });
  });

  describe('_injectAuthIdentity (lines 333-342)', () => {
    let mockPluginManager;

    beforeEach(() => {
      mockPluginManager = {
        get: jest.fn(() => ({ getTemplate: () => 'layout.njk' })),
        setController: jest.fn(),
      };
    });

    it('sets _isAuthenticated=true and _userIdentity when auth service has identity', () => {
      const mockAuthService = {
        hasIdentity: jest.fn(() => true),
        getIdentity: jest.fn(() => ({ id: 1, name: 'TestUser' })),
      };
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'PluginManager') return mockPluginManager;
        if (name === 'AuthenticationService') return mockAuthService;
        if (name === 'Config') return {};
        return null;
      });
      mockServiceManager.has.mockImplementation((name) => name === 'AuthenticationService');

      controller.indexAction = jest.fn(() => 'result');
      controller.dispatch();

      const view = controller.getView();
      expect(view.getVariable('_isAuthenticated')).toBe(true);
      expect(view.getVariable('_userIdentity')).toEqual({ id: 1, name: 'TestUser' });
    });

    it('sets _isAuthenticated=false when auth service throws', () => {
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'PluginManager') return mockPluginManager;
        if (name === 'AuthenticationService') throw new Error('service unavailable');
        if (name === 'Config') return {};
        return null;
      });
      mockServiceManager.has.mockImplementation((name) => name === 'AuthenticationService');

      controller.indexAction = jest.fn(() => 'result');
      controller.dispatch();

      const view = controller.getView();
      expect(view.getVariable('_isAuthenticated')).toBe(false);
    });

    it('skips auth injection when noRender is true', () => {
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'PluginManager') return mockPluginManager;
        if (name === 'Config') return {};
        return null;
      });
      mockServiceManager.has.mockImplementation((name) => name === 'AuthenticationService');

      controller.setNoRender(true);
      controller.indexAction = jest.fn(() => 'result');
      controller.dispatch();

      const view = controller.getView();
      expect(view.getVariable('_isAuthenticated')).toBeNull();
    });
  });

  describe('_handlePreDispatchResult (lines 354-362)', () => {
    let mockPluginManager;

    beforeEach(() => {
      mockPluginManager = {
        get: jest.fn(() => ({ getTemplate: () => 'layout.njk' })),
        setController: jest.fn(),
      };
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'PluginManager') return mockPluginManager;
        if (name === 'Config') return {};
        return null;
      });
      mockServiceManager.has.mockReturnValue(false);
    });

    it('returns null when preResult is a redirect', () => {
      const redirectResult = { isRedirect: () => true };
      controller.preDispatch = () => redirectResult;
      controller.indexAction = jest.fn();
      const result = controller.dispatch();
      expect(result).toBeNull();
      expect(controller.indexAction).not.toHaveBeenCalled();
    });

    it('returns preResult when it is a ViewModel-like object', () => {
      const viewModelResult = {
        getTemplate: () => 'custom.njk',
        getVariables: () => ({ key: 'val' }),
      };
      controller.preDispatch = () => viewModelResult;
      controller.indexAction = jest.fn();
      const result = controller.dispatch();
      expect(result).toBe(viewModelResult);
      expect(controller.indexAction).not.toHaveBeenCalled();
    });
  });

  describe('getViewHelperManager (lines 432-435)', () => {
    it('lazy loads ViewHelperManager from service manager', () => {
      const mockVHM = { get: jest.fn(), syncToViewModel: jest.fn() };
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'ViewHelperManager') return mockVHM;
        return null;
      });
      const vhm = controller.getViewHelperManager();
      expect(vhm).toBe(mockVHM);
      expect(mockServiceManager.get).toHaveBeenCalledWith('ViewHelperManager');
    });
  });

  describe('helper / getFlashMessages (lines 443-457)', () => {
    it('helper() delegates to viewHelperManager.get()', () => {
      const mockHelper = { render: jest.fn() };
      const mockVHM = { get: jest.fn(() => mockHelper) };
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'ViewHelperManager') return mockVHM;
        return null;
      });
      const result = controller.helper('url');
      expect(mockVHM.get).toHaveBeenCalledWith('url', {});
      expect(result).toBe(mockHelper);
    });

    it('getFlashMessages() calls flashMessenger plugin', () => {
      const mockMessages = [{ type: 'success', message: 'Done' }];
      const mockFlash = { getAllMessages: jest.fn(() => mockMessages) };
      const mockPluginManager = {
        get: jest.fn(() => mockFlash),
        setController: jest.fn(),
      };
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'PluginManager') return mockPluginManager;
        return null;
      });
      const result = controller.getFlashMessages();
      expect(mockFlash.getAllMessages).toHaveBeenCalledWith(true);
      expect(result).toBe(mockMessages);
    });
  });

  describe('returnResponse() method (line 275)', () => {
    it('returns the returnResponse property value via prototype method', () => {
      // Constructor sets this.returnResponse = null, shadowing the method.
      // Call via prototype to exercise the method body.
      expect(BaseController.prototype.returnResponse.call(controller)).toBeNull();
    });

    it('returns non-null when property was set', () => {
      const val = { some: 'response' };
      // Set a non-null value, then use prototype to call the method
      const saved = controller.returnResponse;
      controller.returnResponse = val;
      expect(BaseController.prototype.returnResponse.call(controller)).toBe(val);
      controller.returnResponse = saved;
    });
  });

  describe('getSession/setSession throw when no request (lines 188, 197)', () => {
    beforeEach(() => {
      // Make getRequest() return null: event returns null AND Application returns null
      mockEvent.getRequest.mockReturnValue(null);
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'Application') return { getRequest: () => null };
        return null;
      });
    });

    it('getSession throws when request is null', () => {
      expect(() => controller.getSession()).toThrow('Request object not available');
    });

    it('setSession throws when request is null', () => {
      expect(() => controller.setSession({})).toThrow('Request object not available');
    });
  });

  describe('getQuery when no request (line 252)', () => {
    it('returns defaultValue when request is null', () => {
      mockEvent.getRequest.mockReturnValue(null);
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'Application') return { getRequest: () => null };
        return null;
      });
      expect(controller.getQuery('q', 'fallback')).toBe('fallback');
    });
  });

  describe('_prepareViewModel early return (line 316)', () => {
    it('returns early when viewModel is null', () => {
      // Call _prepareViewModel directly with null viewModel
      expect(controller._prepareViewModel(null, mockRouteMatch)).toBeUndefined();
    });

    it('returns early when routeMatch is null', () => {
      const vm = { setVariable: jest.fn() };
      expect(controller._prepareViewModel(vm, null)).toBeUndefined();
      expect(vm.setVariable).not.toHaveBeenCalled();
    });
  });

  describe('_executeAction when not dispatched (line 373)', () => {
    it('returns null when event.isDispatched() returns false', () => {
      mockEvent.isDispatched.mockReturnValue(false);
      const result = controller._executeAction(mockEvent, mockRouteMatch);
      expect(result).toBeNull();
    });
  });

  describe('json() branch coverage', () => {
    it('falls back to null when getHeader is not a function (line 163)', () => {
      // response without getHeader function
      const res = {
        setHeader: jest.fn(),
        setHttpResponseCode: jest.fn(),
        setBody: jest.fn(),
        canSendHeaders: jest.fn(),
        json: jest.fn(),
      };
      mockEvent.getResponse.mockReturnValue(res);
      controller.json({ ok: true });
      // Should set Content-Type since existing will be null
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json; charset=utf-8', true);
    });

    it('handles null headers parameter (line 169)', () => {
      controller.json({ ok: true }, 200, null);
      // Should not throw when iterating null headers (falls back to {})
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('getParam legacy branch - no params property (line 238)', () => {
    it('returns defaultValue when legacy req has no params object', () => {
      const legacyReq = {};
      mockEvent.getRequest.mockReturnValue(legacyReq);
      expect(controller.getParam('id', 'def')).toBe('def');
    });
  });

  describe('getQuery legacy branch - no query property (line 256)', () => {
    it('falls back to empty object when legacy req.query is undefined', () => {
      const legacyReq = {};
      mockEvent.getRequest.mockReturnValue(legacyReq);
      expect(controller.getQuery('q', 'default')).toBe('default');
    });
  });

  describe('_executeAction with no routeMatch (line 375)', () => {
    it('uses null action when routeMatch is null', () => {
      // When routeMatch is null, actionName = null, controller[null]() is called
      // This would throw, which is expected behavior
      expect(() => controller._executeAction(mockEvent, null)).toThrow();
    });
  });

  describe('dispatch with _prepareViewModel early return path', () => {
    it('dispatches correctly when routeMatch is null', () => {
      const mockPluginManager = {
        get: jest.fn(() => ({ getTemplate: () => 'layout.njk' })),
        setController: jest.fn(),
      };
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'PluginManager') return mockPluginManager;
        return null;
      });
      mockServiceManager.has.mockReturnValue(false);

      // Make getRouteMatch return null
      mockEvent.getRouteMatch.mockReturnValue(null);
      // _executeAction with null routeMatch and dispatched=true will try controller[null]()
      // So we need dispatched to be false to hit line 373
      mockEvent.isDispatched.mockReturnValue(false);

      const result = controller.dispatch();
      expect(result).toBeNull();
    });
  });

  describe('_injectAuthIdentity skips when no AuthenticationService (line 331)', () => {
    it('skips when serviceManager does not have AuthenticationService', () => {
      mockServiceManager.has.mockReturnValue(false);
      const vm = { setVariable: jest.fn() };
      controller._injectAuthIdentity(vm);
      // Should not call setVariable for _isAuthenticated
      expect(vm.setVariable).not.toHaveBeenCalled();
    });
  });

  describe('_injectAuthIdentity with hasIdentity false', () => {
    it('sets _isAuthenticated=false and does not set _userIdentity', () => {
      const mockAuthService = {
        hasIdentity: jest.fn(() => false),
      };
      mockServiceManager.has.mockImplementation((name) => name === 'AuthenticationService');
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'AuthenticationService') return mockAuthService;
        return null;
      });
      const vm = { setVariable: jest.fn() };
      controller._injectAuthIdentity(vm);
      expect(vm.setVariable).toHaveBeenCalledWith('_isAuthenticated', false);
      expect(vm.setVariable).not.toHaveBeenCalledWith('_userIdentity', expect.anything());
    });
  });

  describe('_handlePreDispatchResult with null preResult', () => {
    it('short-circuits dispatch when preDispatch returns null', () => {
      const mockPluginManager = {
        get: jest.fn(() => ({ getTemplate: () => 'layout.njk' })),
        setController: jest.fn(),
      };
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'PluginManager') return mockPluginManager;
        return null;
      });
      mockServiceManager.has.mockReturnValue(false);

      controller.preDispatch = () => null;
      controller.indexAction = jest.fn();
      const result = controller.dispatch();
      expect(result).toBeNull();
      expect(controller.indexAction).not.toHaveBeenCalled();
      expect(mockEvent.setDispatched).toHaveBeenCalledWith(false);
    });
  });

  describe('_handlePreDispatchResult with redirect - setDispatched called', () => {
    it('calls setDispatched(false) and postDispatch on redirect', () => {
      const redirectResult = { isRedirect: () => true };
      const result = controller._handlePreDispatchResult(redirectResult, mockEvent);
      expect(result).toBeNull();
      expect(mockEvent.setDispatched).toHaveBeenCalledWith(false);
    });
  });

  describe('_handlePreDispatchResult with ViewModel-like - setDispatched called', () => {
    it('calls setDispatched(false) on viewModel preResult', () => {
      const vmResult = {
        getTemplate: () => 'x.njk',
        getVariables: () => ({}),
      };
      const result = controller._handlePreDispatchResult(vmResult, mockEvent);
      expect(result).toBe(vmResult);
      expect(mockEvent.setDispatched).toHaveBeenCalledWith(false);
    });
  });

  describe('_handlePreDispatchResult without event', () => {
    it('handles null event gracefully for false preResult', () => {
      const result = controller._handlePreDispatchResult(false, null);
      expect(result).toBeNull();
    });

    it('handles null event gracefully for redirect preResult', () => {
      const redirectResult = { isRedirect: () => true };
      const result = controller._handlePreDispatchResult(redirectResult, null);
      expect(result).toBeNull();
    });

    it('handles null event gracefully for viewModel preResult', () => {
      const vmResult = {
        getTemplate: () => 'x.njk',
        getVariables: () => ({}),
      };
      const result = controller._handlePreDispatchResult(vmResult, null);
      expect(result).toBe(vmResult);
    });
  });

  describe('_executeAction without event (line 369-371)', () => {
    it('defaults dispatched to true when event is null', () => {
      controller.testAction = jest.fn(() => 'done');
      const rm = { getAction: () => 'testAction' };
      const result = controller._executeAction(null, rm);
      expect(result).toBe('done');
    });

    it('defaults dispatched to true when event has no isDispatched', () => {
      controller.testAction = jest.fn(() => 'done');
      const rm = { getAction: () => 'testAction' };
      const result = controller._executeAction({}, rm);
      expect(result).toBe('done');
    });
  });

  describe('setHeader without canSendHeaders (line 119)', () => {
    it('works when response has no canSendHeaders', () => {
      const res = { setHeader: jest.fn() };
      mockEvent.getResponse.mockReturnValue(res);
      const result = controller.setHeader('X-Foo', 'bar');
      expect(res.setHeader).toHaveBeenCalledWith('X-Foo', 'bar', true);
      expect(result).toBe(controller);
    });
  });

  describe('setBody without canSendHeaders (line 146)', () => {
    it('works when response has setBody but no canSendHeaders', () => {
      const res = { setBody: jest.fn() };
      mockEvent.getResponse.mockReturnValue(res);
      const result = controller.setBody('content');
      expect(res.setBody).toHaveBeenCalledWith('content');
      expect(result).toBe(controller);
    });
  });

  describe('setBody legacy with falsy body values (line 143)', () => {
    it('sets hasBody=false for null body', () => {
      const legacyRes = { canSendHeaders: jest.fn() };
      mockEvent.getResponse.mockReturnValue(legacyRes);
      controller.setBody(null);
      expect(legacyRes.hasBody).toBe(false);
    });

    it('sets hasBody=false for undefined body', () => {
      const legacyRes = { canSendHeaders: jest.fn() };
      mockEvent.getResponse.mockReturnValue(legacyRes);
      controller.setBody(undefined);
      expect(legacyRes.hasBody).toBe(false);
    });

    it('sets hasBody=false for empty string body', () => {
      const legacyRes = { canSendHeaders: jest.fn() };
      mockEvent.getResponse.mockReturnValue(legacyRes);
      controller.setBody('');
      expect(legacyRes.hasBody).toBe(false);
    });
  });

  describe('prepareFlashMessenger - flash without prepareForView', () => {
    it('does nothing when flash has no prepareForView method', () => {
      const mockFlash = {};
      const mockPluginManager = {
        get: jest.fn(() => mockFlash),
        setController: jest.fn(),
      };
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'PluginManager') return mockPluginManager;
        return null;
      });
      expect(() => controller.prepareFlashMessenger()).not.toThrow();
    });

    it('does nothing when flash is null', () => {
      const mockPluginManager = {
        get: jest.fn(() => null),
        setController: jest.fn(),
      };
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'PluginManager') return mockPluginManager;
        return null;
      });
      expect(() => controller.prepareFlashMessenger()).not.toThrow();
    });
  });

  describe('setServiceManager without setController method', () => {
    it('works when serviceManager has no setController', () => {
      const sm = { get: jest.fn(), has: jest.fn() };
      const result = controller.setServiceManager(sm);
      expect(result).toBe(controller);
      expect(controller.getServiceManager()).toBe(sm);
    });
  });

  describe('getRequest/getResponse event without methods', () => {
    it('getRequest falls back when event has no getRequest method', () => {
      controller.setEvent({});
      const result = controller.getRequest();
      expect(result).toBe(mockRequest); // from Application fallback
    });

    it('getResponse falls back when event has no getResponse method', () => {
      controller.setEvent({});
      const result = controller.getResponse();
      expect(result).toBe(mockResponse); // from Application fallback
    });
  });

  describe('getPluginManager caching', () => {
    it('returns cached pluginManager on second call', () => {
      const mockPM = { setController: jest.fn(), get: jest.fn() };
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'PluginManager') return mockPM;
        return null;
      });
      const pm1 = controller.getPluginManager();
      const pm2 = controller.getPluginManager();
      expect(pm1).toBe(pm2);
      // get should only be called once
      expect(mockServiceManager.get).toHaveBeenCalledTimes(1);
    });

    it('handles pluginManager without setController', () => {
      const mockPM = { get: jest.fn() };
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'PluginManager') return mockPM;
        return null;
      });
      expect(() => controller.getPluginManager()).not.toThrow();
    });
  });

  describe('getViewManager caching', () => {
    it('returns cached viewManager on second call', () => {
      const mockVM = { render: jest.fn() };
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'ViewManager') return mockVM;
        return null;
      });
      const vm1 = controller.getViewManager();
      const vm2 = controller.getViewManager();
      expect(vm1).toBe(vm2);
      expect(mockServiceManager.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('getViewHelperManager caching', () => {
    it('returns cached viewHelperManager on second call', () => {
      const mockVHM = { get: jest.fn() };
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'ViewHelperManager') return mockVHM;
        return null;
      });
      const vhm1 = controller.getViewHelperManager();
      const vhm2 = controller.getViewHelperManager();
      expect(vhm1).toBe(vhm2);
      expect(mockServiceManager.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('_injectAuthIdentity with null authService', () => {
    it('handles authService being null (hasIdentity undefined)', () => {
      mockServiceManager.has.mockImplementation((name) => name === 'AuthenticationService');
      mockServiceManager.get.mockImplementation((name) => {
        if (name === 'AuthenticationService') return null;
        return null;
      });
      const vm = { setVariable: jest.fn() };
      controller._injectAuthIdentity(vm);
      // authService?.hasIdentity() returns undefined (falsy)
      expect(vm.setVariable).toHaveBeenCalledWith('_isAuthenticated', undefined);
    });
  });
});
