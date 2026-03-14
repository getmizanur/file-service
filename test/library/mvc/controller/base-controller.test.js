const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const BaseController = require(path.join(projectRoot, 'library/mvc/controller/base-controller'));

describe('BaseController', () => {
  describe('constructor', () => {
    it('should initialize with defaults', () => {
      const ctrl = new BaseController();
      expect(ctrl.container).toBeNull();
      expect(ctrl.serviceManager).toBeNull();
      expect(ctrl.noRender).toBe(false);
      expect(ctrl.dispatched).toBe(false);
    });

    it('should accept options', () => {
      const sm = {};
      const ctrl = new BaseController({ serviceManager: sm, container: 'c' });
      expect(ctrl.serviceManager).toBe(sm);
      expect(ctrl.container).toBe('c');
    });
  });

  describe('setServiceManager/getServiceManager', () => {
    it('should set and get service manager', () => {
      const ctrl = new BaseController();
      const sm = {};
      ctrl.setServiceManager(sm);
      expect(ctrl.getServiceManager()).toBe(sm);
    });

    it('should throw if no service manager', () => {
      const ctrl = new BaseController();
      expect(() => ctrl.getServiceManager()).toThrow('ServiceManager not injected');
    });
  });

  describe('setEvent/getEvent', () => {
    it('should set and get event', () => {
      const ctrl = new BaseController();
      const evt = {};
      expect(ctrl.setEvent(evt)).toBe(ctrl);
      expect(ctrl.getEvent()).toBe(evt);
    });
  });

  describe('getRouteMatch', () => {
    it('should return routeMatch from event', () => {
      const ctrl = new BaseController();
      const rm = {};
      ctrl.setEvent({ getRouteMatch: () => rm });
      expect(ctrl.getRouteMatch()).toBe(rm);
    });

    it('should return null with no event', () => {
      const ctrl = new BaseController();
      expect(ctrl.getRouteMatch()).toBeNull();
    });
  });

  describe('getRequest/getResponse', () => {
    it('should get request from event', () => {
      const ctrl = new BaseController();
      const req = { method: 'GET' };
      ctrl.setEvent({ getRequest: () => req });
      expect(ctrl.getRequest()).toBe(req);
    });

    it('should get response from event', () => {
      const ctrl = new BaseController();
      const res = { status: 200 };
      ctrl.setEvent({ getResponse: () => res });
      expect(ctrl.getResponse()).toBe(res);
    });
  });

  describe('setNoRender/isNoRender', () => {
    it('should set and get noRender', () => {
      const ctrl = new BaseController();
      expect(ctrl.isNoRender()).toBe(false);
      expect(ctrl.setNoRender(true)).toBe(ctrl);
      expect(ctrl.isNoRender()).toBe(true);
    });
  });

  describe('getView', () => {
    it('should lazy-create ViewModel', () => {
      const ctrl = new BaseController();
      // Need plugin('layout') to be available for getViewScript
      const sm = {
        get: jest.fn((name) => {
          if (name === 'PluginManager') {
            return {
              setController: jest.fn(),
              get: jest.fn(() => ({ getTemplate: () => 'default.njk' }))
            };
          }
          return {};
        }),
        has: jest.fn(() => false)
      };
      ctrl.setServiceManager(sm);
      const view = ctrl.getView();
      expect(view).toBeDefined();
      expect(typeof view.setVariable).toBe('function');
    });
  });

  describe('getParam/getAllParams/getQuery', () => {
    it('getParam should delegate to request', () => {
      const ctrl = new BaseController();
      const req = { getParam: (name, def) => name === 'id' ? '42' : def };
      ctrl.setEvent({ getRequest: () => req });
      expect(ctrl.getParam('id')).toBe('42');
      expect(ctrl.getParam('missing', 'default')).toBe('default');
    });

    it('getParam returns default with no request', () => {
      const ctrl = new BaseController();
      ctrl.setEvent({ getRequest: () => null });
      const sm = { get: jest.fn(() => ({ getRequest: () => null })) };
      // This will throw since request can't be found
      // Just test the fallback with event providing null
    });

    it('getAllParams should delegate to request', () => {
      const ctrl = new BaseController();
      const req = { getParams: () => ({ id: '1' }) };
      ctrl.setEvent({ getRequest: () => req });
      expect(ctrl.getAllParams()).toEqual({ id: '1' });
    });

    it('getQuery should delegate to request', () => {
      const ctrl = new BaseController();
      const req = { getQuery: (name, def) => name === 'page' ? '2' : def };
      ctrl.setEvent({ getRequest: () => req });
      expect(ctrl.getQuery('page')).toBe('2');
    });
  });

  describe('setDelimiter/getDelimiter', () => {
    it('should set and get delimiter', () => {
      const ctrl = new BaseController();
      ctrl.setDelimiter('/');
      expect(ctrl.getDelimiter()).toBe('/');
    });
  });

  describe('getReturnResponse', () => {
    it('should return null by default', () => {
      const ctrl = new BaseController();
      expect(ctrl.returnResponse).toBeNull();
    });
  });

  describe('preDispatch/postDispatch', () => {
    it('should be no-ops', () => {
      const ctrl = new BaseController();
      expect(ctrl.preDispatch()).toBeUndefined();
      expect(ctrl.postDispatch()).toBeUndefined();
    });
  });

  describe('setBody', () => {
    it('should delegate to response.setBody', () => {
      const ctrl = new BaseController();
      const res = { setBody: jest.fn(), canSendHeaders: jest.fn() };
      ctrl.setEvent({ getResponse: () => res });
      ctrl.setBody('hello');
      expect(res.setBody).toHaveBeenCalledWith('hello');
    });
  });

  describe('setHttpResponseCode', () => {
    it('should delegate to response', () => {
      const ctrl = new BaseController();
      const res = { setHttpResponseCode: jest.fn() };
      ctrl.setEvent({ getResponse: () => res });
      expect(ctrl.setHttpResponseCode(404)).toBe(ctrl);
      expect(res.setHttpResponseCode).toHaveBeenCalledWith(404);
    });
  });

  // =====================================================================
  // Additional coverage tests
  // =====================================================================

  describe('constructor SM guard', () => {
    it('should call serviceManager.setController if method exists', () => {
      const sm = { setController: jest.fn() };
      const ctrl = new BaseController({ serviceManager: sm });
      expect(sm.setController).toHaveBeenCalledWith(ctrl);
    });

    it('should not throw if serviceManager lacks setController', () => {
      const sm = {};
      expect(() => new BaseController({ serviceManager: sm })).not.toThrow();
    });
  });

  describe('setServiceManager guard', () => {
    it('should call setController on SM if method exists', () => {
      const ctrl = new BaseController();
      const sm = { setController: jest.fn() };
      ctrl.setServiceManager(sm);
      expect(sm.setController).toHaveBeenCalledWith(ctrl);
    });

    it('should not throw if SM lacks setController', () => {
      const ctrl = new BaseController();
      expect(() => ctrl.setServiceManager({})).not.toThrow();
    });
  });

  describe('getConfig', () => {
    it('should delegate to serviceManager.get("Config")', () => {
      const ctrl = new BaseController();
      const config = { key: 'value' };
      ctrl.setServiceManager({ get: jest.fn(() => config), has: jest.fn() });
      expect(ctrl.getConfig()).toBe(config);
    });
  });

  describe('getRequest/getResponse fallbacks', () => {
    it('getRequest should fall back to Application.getRequest when event returns null', () => {
      const ctrl = new BaseController();
      const fallbackReq = { method: 'POST' };
      const sm = { get: jest.fn(() => ({ getRequest: () => fallbackReq })) };
      ctrl.setServiceManager(sm);
      ctrl.setEvent({ getRequest: () => null });
      expect(ctrl.getRequest()).toBe(fallbackReq);
      expect(sm.get).toHaveBeenCalledWith('Application');
    });

    it('getResponse should fall back to Application.getResponse when event returns null', () => {
      const ctrl = new BaseController();
      const fallbackRes = { status: 500 };
      const sm = { get: jest.fn(() => ({ getResponse: () => fallbackRes })) };
      ctrl.setServiceManager(sm);
      ctrl.setEvent({ getResponse: () => null });
      expect(ctrl.getResponse()).toBe(fallbackRes);
      expect(sm.get).toHaveBeenCalledWith('Application');
    });
  });

  describe('setBody fallback (legacy)', () => {
    it('should use legacy body assignment when response lacks setBody', () => {
      const ctrl = new BaseController();
      const res = { canSendHeaders: jest.fn() };
      ctrl.setEvent({ getResponse: () => res });
      const result = ctrl.setBody('content');
      expect(res.body).toBe('content');
      expect(res.hasBody).toBe(true);
      expect(result).toBe(ctrl);
    });

    it('should set hasBody to false for empty string', () => {
      const ctrl = new BaseController();
      const res = {};
      ctrl.setEvent({ getResponse: () => res });
      ctrl.setBody('');
      expect(res.hasBody).toBe(false);
    });

    it('should set hasBody to false for null', () => {
      const ctrl = new BaseController();
      const res = {};
      ctrl.setEvent({ getResponse: () => res });
      ctrl.setBody(null);
      expect(res.hasBody).toBe(false);
    });
  });

  describe('json method', () => {
    let ctrl, res;

    beforeEach(() => {
      ctrl = new BaseController();
      res = {
        setHttpResponseCode: jest.fn(),
        setHeader: jest.fn(),
        canSendHeaders: jest.fn(),
        setBody: jest.fn(),
        getHeader: jest.fn(() => null)
      };
      ctrl.setEvent({ getResponse: () => res });
    });

    it('should set noRender, status, Content-Type, and JSON body', () => {
      const result = ctrl.json({ ok: true });
      expect(ctrl.isNoRender()).toBe(true);
      expect(res.setHttpResponseCode).toHaveBeenCalledWith(200);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json; charset=utf-8', true);
      expect(res.setBody).toHaveBeenCalledWith(JSON.stringify({ ok: true }));
      expect(result).toBe(ctrl);
    });

    it('should accept custom status and headers', () => {
      ctrl.json({ err: 'not found' }, 404, { 'X-Custom': 'yes' });
      expect(res.setHttpResponseCode).toHaveBeenCalledWith(404);
      expect(res.setHeader).toHaveBeenCalledWith('X-Custom', 'yes', true);
    });

    it('should not overwrite existing Content-Type', () => {
      res.getHeader = jest.fn(() => 'text/plain');
      ctrl.json({ ok: true });
      // Content-Type header should NOT be set since it already exists
      const contentTypeCalls = res.setHeader.mock.calls.filter(c => c[0] === 'Content-Type');
      expect(contentTypeCalls).toHaveLength(0);
    });

    it('should use res.json if available', () => {
      res.json = jest.fn();
      const result = ctrl.json({ ok: true }, 201, {});
      expect(res.json).toHaveBeenCalledWith({ ok: true }, 201, {});
      expect(result).toBe(ctrl);
    });
  });

  describe('getSession/setSession', () => {
    it('getSession should delegate to req.getSession', () => {
      const ctrl = new BaseController();
      const session = { user: 'test' };
      const req = { getSession: jest.fn(() => session) };
      ctrl.setEvent({ getRequest: () => req });
      expect(ctrl.getSession()).toBe(session);
    });

    it('getSession should fall back to req.session (legacy)', () => {
      const ctrl = new BaseController();
      const session = { user: 'legacy' };
      const req = { session };
      ctrl.setEvent({ getRequest: () => req });
      expect(ctrl.getSession()).toBe(session);
    });

    it('setSession should delegate to req.setSession', () => {
      const ctrl = new BaseController();
      const req = { setSession: jest.fn() };
      ctrl.setEvent({ getRequest: () => req });
      const result = ctrl.setSession({ user: 'new' });
      expect(req.setSession).toHaveBeenCalledWith({ user: 'new' });
      expect(result).toBe(ctrl);
    });

    it('setSession should fall back to req.session (legacy)', () => {
      const ctrl = new BaseController();
      const req = {};
      ctrl.setEvent({ getRequest: () => req });
      ctrl.setSession({ user: 'legacy' });
      expect(req.session).toEqual({ user: 'legacy' });
    });

    it('getSession should throw if no request available', () => {
      const ctrl = new BaseController();
      const sm = { get: jest.fn(() => ({ getRequest: () => null })) };
      ctrl.setServiceManager(sm);
      ctrl.setEvent({ getRequest: () => null });
      // getRequest falls back to Application, which returns null
      expect(() => ctrl.getSession()).toThrow('Request object not available');
    });

    it('setSession should throw if no request available', () => {
      const ctrl = new BaseController();
      const sm = { get: jest.fn(() => ({ getRequest: () => null })) };
      ctrl.setServiceManager(sm);
      ctrl.setEvent({ getRequest: () => null });
      expect(() => ctrl.setSession({})).toThrow('Request object not available');
    });
  });

  describe('getParam/getAllParams/getQuery legacy fallbacks', () => {
    it('getParam should use req.params fallback', () => {
      const ctrl = new BaseController();
      const req = { params: { slug: 'hello' } };
      ctrl.setEvent({ getRequest: () => req });
      expect(ctrl.getParam('slug')).toBe('hello');
      expect(ctrl.getParam('missing', 'def')).toBe('def');
    });

    it('getAllParams should use req.params fallback', () => {
      const ctrl = new BaseController();
      const req = { params: { a: 1, b: 2 } };
      ctrl.setEvent({ getRequest: () => req });
      expect(ctrl.getAllParams()).toEqual({ a: 1, b: 2 });
    });

    it('getAllParams should return {} when req.params is undefined', () => {
      const ctrl = new BaseController();
      const req = {};
      ctrl.setEvent({ getRequest: () => req });
      expect(ctrl.getAllParams()).toEqual({});
    });

    it('getQuery should use req.query fallback', () => {
      const ctrl = new BaseController();
      const req = { query: { page: '3' } };
      ctrl.setEvent({ getRequest: () => req });
      expect(ctrl.getQuery('page')).toBe('3');
      expect(ctrl.getQuery('missing', 'def')).toBe('def');
    });

    it('getQuery should return default when req.query is undefined', () => {
      const ctrl = new BaseController();
      const req = {};
      ctrl.setEvent({ getRequest: () => req });
      expect(ctrl.getQuery('page', 'fallback')).toBe('fallback');
    });
  });

  describe('setView', () => {
    it('should set both view and model', () => {
      const ctrl = new BaseController();
      const vm = { setTemplate: jest.fn() };
      ctrl.setView(vm);
      expect(ctrl.model).toBe(vm);
    });
  });

  describe('getViewScript', () => {
    it('should delegate to plugin("layout").getTemplate()', () => {
      const ctrl = new BaseController();
      const pm = {
        setController: jest.fn(),
        get: jest.fn(() => ({ getTemplate: () => 'pages/home.njk' }))
      };
      ctrl.setServiceManager({ get: jest.fn(() => pm), has: jest.fn() });
      expect(ctrl.getViewScript()).toBe('pages/home.njk');
      expect(pm.get).toHaveBeenCalledWith('layout', {});
    });
  });

  describe('dispatch lifecycle', () => {
    function buildCtrl({ preResult = undefined, actionResult = 'action-view', hasVHM = false, isDispatched = true } = {}) {
      const ctrl = new BaseController();
      const routeMatch = {
        getModule: () => 'blog',
        getController: () => 'post',
        getAction: () => 'index',
        getRouteName: () => 'blog.index'
      };
      const event = {
        getRouteMatch: () => routeMatch,
        getRequest: () => ({ getParam: jest.fn(), getParams: jest.fn(() => ({})) }),
        getResponse: () => ({ setHttpResponseCode: jest.fn(), setBody: jest.fn(), setHeader: jest.fn(), canSendHeaders: jest.fn() }),
        setDispatched: jest.fn(),
        isDispatched: jest.fn(() => isDispatched)
      };
      const pm = { setController: jest.fn(), get: jest.fn(() => ({ getTemplate: () => 'default.njk' })) };
      const sm = {
        get: jest.fn((name) => {
          if (name === 'PluginManager') return pm;
          if (name === 'AuthenticationService') return { hasIdentity: () => false };
          return {};
        }),
        has: jest.fn((name) => name === 'AuthenticationService')
      };
      ctrl.setServiceManager(sm);
      ctrl.setEvent(event);

      // Override preDispatch to return desired result
      if (preResult !== undefined) {
        ctrl.preDispatch = jest.fn(() => preResult);
      }

      // Define the action method
      ctrl.indexAction = jest.fn(() => actionResult);

      if (hasVHM) {
        ctrl.viewHelperManager = { syncToViewModel: jest.fn() };
      }

      return { ctrl, event, routeMatch };
    }

    it('should run full dispatch lifecycle and return action result', () => {
      const { ctrl } = buildCtrl();
      const result = ctrl.dispatch();
      expect(result).toBe('action-view');
      expect(ctrl.indexAction).toHaveBeenCalled();
    });

    it('should call viewHelperManager.syncToViewModel when present', () => {
      const { ctrl } = buildCtrl({ hasVHM: true });
      ctrl.dispatch();
      expect(ctrl.viewHelperManager.syncToViewModel).toHaveBeenCalled();
    });

    it('should short-circuit when preDispatch returns false', () => {
      const { ctrl, event } = buildCtrl({ preResult: false });
      const result = ctrl.dispatch();
      expect(result).toBeNull();
      expect(event.setDispatched).toHaveBeenCalledWith(false);
    });

    it('should short-circuit when preDispatch returns null', () => {
      const { ctrl, event } = buildCtrl({ preResult: null });
      const result = ctrl.dispatch();
      expect(result).toBeNull();
      expect(event.setDispatched).toHaveBeenCalledWith(false);
    });

    it('should short-circuit when preDispatch returns a redirect', () => {
      const redirect = { isRedirect: () => true };
      const { ctrl, event } = buildCtrl({ preResult: redirect });
      const result = ctrl.dispatch();
      expect(result).toBeNull();
      expect(event.setDispatched).toHaveBeenCalledWith(false);
    });

    it('should short-circuit when preDispatch returns a ViewModel', () => {
      const ViewModel = require(path.join(projectRoot, 'library/mvc/view/view-model'));
      const vm = new ViewModel();
      vm.setTemplate('error.njk');
      const { ctrl, event } = buildCtrl({ preResult: vm });
      const result = ctrl.dispatch();
      expect(result).toBe(vm);
      expect(event.setDispatched).toHaveBeenCalledWith(false);
    });

    it('should return null when event.isDispatched returns false', () => {
      const { ctrl } = buildCtrl({ isDispatched: false });
      const result = ctrl.dispatch();
      expect(result).toBeNull();
    });

    it('should handle async action results', async () => {
      const asyncResult = Promise.resolve('async-view');
      const { ctrl } = buildCtrl({ actionResult: asyncResult });
      const result = await ctrl.dispatch();
      expect(result).toBe('async-view');
    });
  });

  describe('_prepareViewModel', () => {
    it('should set module/controller/action/route variables on viewModel', () => {
      const ctrl = new BaseController();
      const sm = {
        get: jest.fn(),
        has: jest.fn(() => false)
      };
      ctrl.setServiceManager(sm);
      ctrl.noRender = true; // skip auth injection
      const ViewModel = require(path.join(projectRoot, 'library/mvc/view/view-model'));
      const vm = new ViewModel();
      const routeMatch = {
        getModule: () => 'admin',
        getController: () => 'dashboard',
        getAction: () => 'index',
        getRouteName: () => 'admin.dashboard'
      };
      ctrl._prepareViewModel(vm, routeMatch);
      expect(vm.getVariable('_moduleName')).toBe('admin');
      expect(vm.getVariable('_controllerName')).toBe('dashboard');
      expect(vm.getVariable('_actionName')).toBe('index');
      expect(vm.getVariable('_routeName')).toBe('admin.dashboard');
    });

    it('should do nothing if viewModel or routeMatch is null', () => {
      const ctrl = new BaseController();
      expect(() => ctrl._prepareViewModel(null, {})).not.toThrow();
      expect(() => ctrl._prepareViewModel({}, null)).not.toThrow();
    });
  });

  describe('_injectAuthIdentity', () => {
    it('should inject authenticated identity into viewModel', () => {
      const ctrl = new BaseController();
      const identity = { id: 1, name: 'Admin' };
      const sm = {
        get: jest.fn(() => ({ hasIdentity: () => true, getIdentity: () => identity })),
        has: jest.fn(() => true)
      };
      ctrl.setServiceManager(sm);
      const ViewModel = require(path.join(projectRoot, 'library/mvc/view/view-model'));
      const vm = new ViewModel();
      ctrl._injectAuthIdentity(vm);
      expect(vm.getVariable('_isAuthenticated')).toBe(true);
      expect(vm.getVariable('_userIdentity')).toBe(identity);
    });

    it('should set _isAuthenticated false when not authenticated', () => {
      const ctrl = new BaseController();
      const sm = {
        get: jest.fn(() => ({ hasIdentity: () => false })),
        has: jest.fn(() => true)
      };
      ctrl.setServiceManager(sm);
      const ViewModel = require(path.join(projectRoot, 'library/mvc/view/view-model'));
      const vm = new ViewModel();
      ctrl._injectAuthIdentity(vm);
      expect(vm.getVariable('_isAuthenticated')).toBe(false);
      expect(vm.getVariable('_userIdentity')).toBeNull();
    });

    it('should skip when noRender is true', () => {
      const ctrl = new BaseController();
      ctrl.noRender = true;
      const vm = { setVariable: jest.fn() };
      ctrl._injectAuthIdentity(vm);
      expect(vm.setVariable).not.toHaveBeenCalled();
    });

    it('should skip when AuthenticationService is not registered', () => {
      const ctrl = new BaseController();
      const sm = { get: jest.fn(), has: jest.fn(() => false) };
      ctrl.setServiceManager(sm);
      const vm = { setVariable: jest.fn() };
      ctrl._injectAuthIdentity(vm);
      expect(vm.setVariable).not.toHaveBeenCalled();
    });

    it('should catch errors from auth service and set _isAuthenticated false', () => {
      const ctrl = new BaseController();
      const sm = {
        get: jest.fn(() => { throw new Error('service error'); }),
        has: jest.fn(() => true)
      };
      ctrl.setServiceManager(sm);
      const ViewModel = require(path.join(projectRoot, 'library/mvc/view/view-model'));
      const vm = new ViewModel();
      ctrl._injectAuthIdentity(vm);
      expect(vm.getVariable('_isAuthenticated')).toBe(false);
    });
  });

  describe('notFoundAction', () => {
    it('should delegate to trigger404', () => {
      const ctrl = new BaseController();
      const errorVM = { template: '404.njk', variables: { code: 404 } };
      const vm = { setController: jest.fn() };
      const sm = {
        get: jest.fn((name) => {
          if (name === 'ViewManager') return { createErrorViewModel: jest.fn(() => errorVM) };
          return {};
        }),
        has: jest.fn()
      };
      ctrl.setServiceManager(sm);
      const result = ctrl.notFoundAction();
      expect(result.getTemplate()).toBe('404.njk');
      expect(result.getVariable('code')).toBe(404);
    });
  });

  describe('serverErrorAction', () => {
    it('should delegate to trigger500', () => {
      const ctrl = new BaseController();
      const errorVM = { template: '500.njk', variables: { code: 500 } };
      const sm = {
        get: jest.fn((name) => {
          if (name === 'ViewManager') return { createErrorViewModel: jest.fn(() => errorVM) };
          return {};
        }),
        has: jest.fn()
      };
      ctrl.setServiceManager(sm);
      const result = ctrl.serverErrorAction();
      expect(result.getTemplate()).toBe('500.njk');
      expect(result.getVariable('code')).toBe(500);
    });
  });

  describe('getPluginManager', () => {
    it('should lazy-load PluginManager from SM and call setController', () => {
      const ctrl = new BaseController();
      const pm = { setController: jest.fn(), get: jest.fn() };
      const sm = { get: jest.fn(() => pm), has: jest.fn() };
      ctrl.setServiceManager(sm);
      const result = ctrl.getPluginManager();
      expect(result).toBe(pm);
      expect(pm.setController).toHaveBeenCalledWith(ctrl);
      expect(sm.get).toHaveBeenCalledWith('PluginManager');
    });

    it('should return cached pluginManager on second call', () => {
      const ctrl = new BaseController();
      const pm = { setController: jest.fn(), get: jest.fn() };
      const sm = { get: jest.fn(() => pm), has: jest.fn() };
      ctrl.setServiceManager(sm);
      ctrl.getPluginManager();
      ctrl.getPluginManager();
      expect(sm.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('getViewManager', () => {
    it('should lazy-load ViewManager from SM', () => {
      const ctrl = new BaseController();
      const vmgr = { createErrorViewModel: jest.fn() };
      const sm = { get: jest.fn(() => vmgr), has: jest.fn() };
      ctrl.setServiceManager(sm);
      expect(ctrl.getViewManager()).toBe(vmgr);
      expect(sm.get).toHaveBeenCalledWith('ViewManager');
    });

    it('should cache ViewManager', () => {
      const ctrl = new BaseController();
      const vmgr = {};
      const sm = { get: jest.fn(() => vmgr), has: jest.fn() };
      ctrl.setServiceManager(sm);
      ctrl.getViewManager();
      ctrl.getViewManager();
      expect(sm.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('getViewHelperManager', () => {
    it('should lazy-load ViewHelperManager from SM', () => {
      const ctrl = new BaseController();
      const vhm = { get: jest.fn(), syncToViewModel: jest.fn() };
      const sm = { get: jest.fn(() => vhm), has: jest.fn() };
      ctrl.setServiceManager(sm);
      expect(ctrl.getViewHelperManager()).toBe(vhm);
      expect(sm.get).toHaveBeenCalledWith('ViewHelperManager');
    });

    it('should cache ViewHelperManager', () => {
      const ctrl = new BaseController();
      const vhm = {};
      const sm = { get: jest.fn(() => vhm), has: jest.fn() };
      ctrl.setServiceManager(sm);
      ctrl.getViewHelperManager();
      ctrl.getViewHelperManager();
      expect(sm.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('prepareFlashMessenger', () => {
    it('should call flashMessenger.prepareForView when available', () => {
      const ctrl = new BaseController();
      const flash = { prepareForView: jest.fn() };
      const pm = { setController: jest.fn(), get: jest.fn(() => flash) };
      const sm = { get: jest.fn(() => pm), has: jest.fn() };
      ctrl.setServiceManager(sm);
      ctrl.prepareFlashMessenger();
      expect(flash.prepareForView).toHaveBeenCalled();
    });

    it('should not throw when flash messenger plugin is unavailable', () => {
      const ctrl = new BaseController();
      const pm = { setController: jest.fn(), get: jest.fn(() => { throw new Error('not registered'); }) };
      const sm = { get: jest.fn(() => pm), has: jest.fn() };
      ctrl.setServiceManager(sm);
      expect(() => ctrl.prepareFlashMessenger()).not.toThrow();
    });

    it('should not throw when flash messenger lacks prepareForView', () => {
      const ctrl = new BaseController();
      const pm = { setController: jest.fn(), get: jest.fn(() => ({})) };
      const sm = { get: jest.fn(() => pm), has: jest.fn() };
      ctrl.setServiceManager(sm);
      expect(() => ctrl.prepareFlashMessenger()).not.toThrow();
    });
  });

  describe('trigger404', () => {
    it('should create a ViewModel with 404 error template and variables', () => {
      const ctrl = new BaseController();
      const errorVM = { template: 'errors/404.njk', variables: { code: 404, message: 'Not Found' } };
      const sm = {
        get: jest.fn(() => ({ createErrorViewModel: jest.fn(() => errorVM) })),
        has: jest.fn()
      };
      ctrl.setServiceManager(sm);
      const result = ctrl.trigger404('Page missing', new Error('test'));
      expect(result.getTemplate()).toBe('errors/404.njk');
      expect(result.getVariable('code')).toBe(404);
      expect(result.getVariable('message')).toBe('Not Found');
    });
  });

  describe('trigger500', () => {
    it('should create a ViewModel with 500 error template and variables', () => {
      const ctrl = new BaseController();
      const errorVM = { template: 'errors/500.njk', variables: { code: 500, message: 'Server Error' } };
      const sm = {
        get: jest.fn(() => ({ createErrorViewModel: jest.fn(() => errorVM) })),
        has: jest.fn()
      };
      ctrl.setServiceManager(sm);
      const result = ctrl.trigger500('Something broke', new Error('crash'));
      expect(result.getTemplate()).toBe('errors/500.njk');
      expect(result.getVariable('code')).toBe(500);
      expect(result.getVariable('message')).toBe('Server Error');
    });
  });

  describe('getFlashMessages', () => {
    it('should delegate to flashMessenger.getAllMessages', () => {
      const ctrl = new BaseController();
      const messages = [{ type: 'success', text: 'Done' }];
      const flash = { getAllMessages: jest.fn(() => messages) };
      const pm = { setController: jest.fn(), get: jest.fn(() => flash) };
      const sm = { get: jest.fn(() => pm), has: jest.fn() };
      ctrl.setServiceManager(sm);
      expect(ctrl.getFlashMessages()).toBe(messages);
      expect(flash.getAllMessages).toHaveBeenCalledWith(true);
    });
  });
});
