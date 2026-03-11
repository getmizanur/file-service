const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const MvcEvent = require(path.join(projectRoot, 'library/mvc/mvc-event'));

describe('MvcEvent', () => {
  let event;

  beforeEach(() => {
    event = new MvcEvent();
  });

  describe('initial state', () => {
    it('should have null defaults for all properties', () => {
      expect(event.request).toBeNull();
      expect(event.response).toBeNull();
      expect(event.routeMatch).toBeNull();
      expect(event.viewModel).toBeNull();
      expect(event.result).toBeNull();
      expect(event.error).toBeNull();
      expect(event.exception).toBeNull();
      expect(event.serviceManager).toBeNull();
    });

    it('should have dispatched as false', () => {
      expect(event.dispatched).toBe(false);
    });

    it('should have empty params', () => {
      expect(Object.keys(event.getParams())).toHaveLength(0);
    });
  });

  describe('setRequest / getRequest', () => {
    it('should set and get request', () => {
      const req = { url: '/test' };
      const result = event.setRequest(req);
      expect(result).toBe(event);
      expect(event.getRequest()).toBe(req);
    });
  });

  describe('setResponse / getResponse', () => {
    it('should set and get response', () => {
      const res = { statusCode: 200 };
      const result = event.setResponse(res);
      expect(result).toBe(event);
      expect(event.getResponse()).toBe(res);
    });
  });

  describe('setRouteMatch / getRouteMatch', () => {
    it('should set and get routeMatch', () => {
      const rm = { controller: 'index', action: 'home' };
      const result = event.setRouteMatch(rm);
      expect(result).toBe(event);
      expect(event.getRouteMatch()).toBe(rm);
    });
  });

  describe('setViewModel / getViewModel', () => {
    it('should set and get viewModel', () => {
      const vm = { template: 'home' };
      const result = event.setViewModel(vm);
      expect(result).toBe(event);
      expect(event.getViewModel()).toBe(vm);
    });
  });

  describe('setResult / getResult', () => {
    it('should set and get result', () => {
      const r = { data: 'output' };
      const result = event.setResult(r);
      expect(result).toBe(event);
      expect(event.getResult()).toBe(r);
    });
  });

  describe('setError / getError', () => {
    it('should set and get error', () => {
      const err = new Error('something went wrong');
      const result = event.setError(err);
      expect(result).toBe(event);
      expect(event.getError()).toBe(err);
    });
  });

  describe('setException / getException', () => {
    it('should set and get exception', () => {
      const exc = new Error('exception occurred');
      const result = event.setException(exc);
      expect(result).toBe(event);
      expect(event.getException()).toBe(exc);
    });
  });

  describe('setServiceManager / getServiceManager', () => {
    it('should set and get serviceManager', () => {
      const sm = { get: jest.fn() };
      const result = event.setServiceManager(sm);
      expect(result).toBe(event);
      expect(event.getServiceManager()).toBe(sm);
    });
  });

  describe('setDispatched / isDispatched', () => {
    it('should set dispatched to true by default', () => {
      const result = event.setDispatched();
      expect(result).toBe(event);
      expect(event.isDispatched()).toBe(true);
    });

    it('should set dispatched to true when passed true', () => {
      event.setDispatched(true);
      expect(event.isDispatched()).toBe(true);
    });

    it('should set dispatched to false when passed false', () => {
      event.setDispatched(true);
      event.setDispatched(false);
      expect(event.isDispatched()).toBe(false);
    });

    it('should coerce truthy/falsy values to boolean', () => {
      event.setDispatched(1);
      expect(event.isDispatched()).toBe(true);
      event.setDispatched(0);
      expect(event.isDispatched()).toBe(false);
    });
  });

  describe('setParam / getParam / getParams', () => {
    it('should set and get a param', () => {
      const result = event.setParam('key', 'value');
      expect(result).toBe(event);
      expect(event.getParam('key')).toBe('value');
    });

    it('should return default value when param does not exist', () => {
      expect(event.getParam('missing')).toBeNull();
      expect(event.getParam('missing', 'fallback')).toBe('fallback');
    });

    it('should return all params via getParams', () => {
      event.setParam('a', 1);
      event.setParam('b', 2);
      const params = event.getParams();
      expect(params.a).toBe(1);
      expect(params.b).toBe(2);
    });

    it('should overwrite existing param', () => {
      event.setParam('key', 'old');
      event.setParam('key', 'new');
      expect(event.getParam('key')).toBe('new');
    });

    it('should default to null when no default provided', () => {
      expect(event.getParam('nonexistent')).toBeNull();
    });
  });
});
