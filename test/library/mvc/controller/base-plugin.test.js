const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const BasePlugin = require(path.join(projectRoot, 'library/mvc/controller/base-plugin'));

// Mock controller that satisfies _isControllerLike
function createMockController(overrides = {}) {
  return {
    getRequest: jest.fn(() => ({ url: '/test' })),
    getResponse: jest.fn(() => ({ status: 200 })),
    getServiceManager: jest.fn(() => ({
      get: jest.fn((name) => {
        if (name === 'Application') return { name: 'app' };
        if (name === 'Config') return { key: 'val' };
        return null;
      })
    })),
    plugin: jest.fn(),
    getConfig: jest.fn(() => ({ router: {} })),
    ...overrides
  };
}

describe('BasePlugin', () => {
  describe('constructor', () => {
    it('should create with default options', () => {
      const plugin = new BasePlugin();
      expect(plugin.getOptions()).toEqual({});
    });

    it('should accept options', () => {
      const plugin = new BasePlugin({ foo: 'bar' });
      expect(plugin.getOption('foo')).toBe('bar');
    });
  });

  describe('_isControllerLike', () => {
    it('should return false for null', () => {
      const plugin = new BasePlugin();
      expect(plugin._isControllerLike(null)).toBe(false);
    });

    it('should return true for duck-typed controller', () => {
      const plugin = new BasePlugin();
      expect(plugin._isControllerLike(createMockController())).toBe(true);
    });

    it('should return false for incomplete object', () => {
      const plugin = new BasePlugin();
      expect(plugin._isControllerLike({ getRequest: jest.fn() })).toBe(false);
    });
  });

  describe('setController / getController', () => {
    it('should set and get controller', () => {
      const plugin = new BasePlugin();
      const ctrl = createMockController();
      expect(plugin.setController(ctrl)).toBe(plugin);
      expect(plugin.getController()).toBe(ctrl);
    });

    it('should throw for invalid controller', () => {
      const plugin = new BasePlugin();
      expect(() => plugin.setController({})).toThrow('not compatible');
    });
  });

  describe('getServiceManager', () => {
    it('should return service manager from controller', () => {
      const plugin = new BasePlugin();
      plugin.setController(createMockController());
      expect(plugin.getServiceManager()).toBeDefined();
    });

    it('should throw when no controller', () => {
      const plugin = new BasePlugin();
      expect(() => plugin.getServiceManager()).toThrow('Controller not set');
    });
  });

  describe('getApplication', () => {
    it('should get Application from service manager', () => {
      const plugin = new BasePlugin();
      plugin.setController(createMockController());
      expect(plugin.getApplication()).toEqual({ name: 'app' });
    });
  });

  describe('getRequest / getResponse', () => {
    it('should delegate to controller', () => {
      const plugin = new BasePlugin();
      plugin.setController(createMockController());
      expect(plugin.getRequest()).toEqual({ url: '/test' });
      expect(plugin.getResponse()).toEqual({ status: 200 });
    });

    it('should throw when no controller', () => {
      const plugin = new BasePlugin();
      expect(() => plugin.getRequest()).toThrow('Controller not set');
      expect(() => plugin.getResponse()).toThrow('Controller not set');
    });
  });

  describe('getConfig', () => {
    it('should get config from controller', () => {
      const plugin = new BasePlugin();
      plugin.setController(createMockController());
      expect(plugin.getConfig()).toEqual({ router: {} });
    });

    it('should fall back to service manager Config', () => {
      const plugin = new BasePlugin();
      const ctrl = createMockController();
      delete ctrl.getConfig;
      plugin.setController(ctrl);
      expect(plugin.getConfig()).toEqual({ key: 'val' });
    });
  });

  describe('options', () => {
    it('should set/get options', () => {
      const plugin = new BasePlugin();
      expect(plugin.setOptions({ a: 1 })).toBe(plugin);
      expect(plugin.getOptions()).toEqual({ a: 1 });
    });

    it('should handle null in setOptions', () => {
      const plugin = new BasePlugin();
      plugin.setOptions(null);
      expect(plugin.getOptions()).toEqual({});
    });

    it('should return default for missing option key', () => {
      const plugin = new BasePlugin();
      expect(plugin.getOption('missing')).toBeNull();
      expect(plugin.getOption('missing', 'def')).toBe('def');
    });
  });

  describe('branch coverage', () => {
    it('should handle null options in constructor (line 17 || {} fallback)', () => {
      const plugin = new BasePlugin(null);
      expect(plugin.options).toEqual({});
    });

    it('should handle instanceof check for real BaseController (line 29)', () => {
      const BaseController = require(path.join(projectRoot, 'library/mvc/controller/base-controller'));
      const plugin = new BasePlugin();
      const ctrl = new BaseController();
      // BaseController instance should pass _isControllerLike
      expect(plugin._isControllerLike(ctrl)).toBe(true);
    });

    it('should handle getOptions when this.options is falsy (line 103)', () => {
      const plugin = new BasePlugin();
      plugin.options = null;
      expect(plugin.getOptions()).toEqual({});
    });

    it('should handle setOptions with no arguments (line 97 default param)', () => {
      const plugin = new BasePlugin({ a: 1 });
      plugin.setOptions();
      expect(plugin.options).toEqual({});
    });
  });

  describe('lifecycle hooks', () => {
    it('preDispatch should be callable', () => {
      const plugin = new BasePlugin();
      expect(() => plugin.preDispatch()).not.toThrow();
    });

    it('postDispatch should be callable', () => {
      const plugin = new BasePlugin();
      expect(() => plugin.postDispatch()).not.toThrow();
    });
  });
});
