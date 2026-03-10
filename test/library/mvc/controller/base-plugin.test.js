const BasePlugin = require('../../../../library/mvc/controller/base-plugin');

describe('BasePlugin', () => {
  let plugin;
  let mockController;
  let mockServiceManager;

  beforeEach(() => {
    mockServiceManager = {
      get: jest.fn((name) => {
        if (name === 'Config') return { appName: 'test' };
        if (name === 'Application') return { name: 'TestApp' };
        return null;
      }),
      has: jest.fn(() => false),
    };

    mockController = {
      getRequest: jest.fn(() => ({ url: '/test' })),
      getResponse: jest.fn(() => ({ status: 200 })),
      getServiceManager: jest.fn(() => mockServiceManager),
      getConfig: jest.fn(() => ({ appName: 'test' })),
      plugin: jest.fn(),
    };

    plugin = new BasePlugin();
  });

  describe('constructor', () => {
    it('creates with default empty options', () => {
      expect(plugin.getOptions()).toEqual({});
    });

    it('creates with provided options', () => {
      const p = new BasePlugin({ key: 'value' });
      expect(p.getOption('key')).toBe('value');
    });

    it('handles null options', () => {
      const p = new BasePlugin(null);
      expect(p.getOptions()).toEqual({});
    });
  });

  describe('setController / getController', () => {
    it('sets and gets controller', () => {
      plugin.setController(mockController);
      expect(plugin.getController()).toBe(mockController);
    });

    it('returns this for chaining', () => {
      expect(plugin.setController(mockController)).toBe(plugin);
    });

    it('throws TypeError for incompatible object', () => {
      expect(() => plugin.setController({})).toThrow(TypeError);
      expect(() => plugin.setController({})).toThrow('not compatible with BaseController');
    });

    it('throws TypeError for null', () => {
      expect(() => plugin.setController(null)).toThrow(TypeError);
    });

    it('returns null initially', () => {
      expect(plugin.getController()).toBeNull();
    });
  });

  describe('_isControllerLike(obj)', () => {
    it('returns false for null', () => {
      expect(plugin._isControllerLike(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(plugin._isControllerLike(undefined)).toBe(false);
    });

    it('returns false for plain object missing methods', () => {
      expect(plugin._isControllerLike({ getRequest: jest.fn() })).toBe(false);
    });

    it('returns true for duck-typed controller', () => {
      expect(plugin._isControllerLike(mockController)).toBe(true);
    });

    it('returns true for actual BaseController instance', () => {
      const BaseController = require('../../../../library/mvc/controller/base-controller');
      const ctrl = new BaseController();
      expect(plugin._isControllerLike(ctrl)).toBe(true);
    });
  });

  describe('convenience accessors', () => {
    beforeEach(() => {
      plugin.setController(mockController);
    });

    it('getServiceManager delegates to controller', () => {
      expect(plugin.getServiceManager()).toBe(mockServiceManager);
    });

    it('getServiceManager throws when no controller set', () => {
      const p = new BasePlugin();
      expect(() => p.getServiceManager()).toThrow('Controller not set on plugin');
    });

    it('getApplication gets Application from service manager', () => {
      const app = plugin.getApplication();
      expect(mockServiceManager.get).toHaveBeenCalledWith('Application');
      expect(app).toEqual({ name: 'TestApp' });
    });

    it('getRequest delegates to controller', () => {
      expect(plugin.getRequest()).toEqual({ url: '/test' });
    });

    it('getRequest throws when no controller set', () => {
      const p = new BasePlugin();
      expect(() => p.getRequest()).toThrow('Controller not set on plugin');
    });

    it('getResponse delegates to controller', () => {
      expect(plugin.getResponse()).toEqual({ status: 200 });
    });

    it('getResponse throws when no controller set', () => {
      const p = new BasePlugin();
      expect(() => p.getResponse()).toThrow('Controller not set on plugin');
    });

    it('getConfig delegates to controller.getConfig', () => {
      expect(plugin.getConfig()).toEqual({ appName: 'test' });
      expect(mockController.getConfig).toHaveBeenCalled();
    });

    it('getConfig falls back to service manager when controller has no getConfig', () => {
      const ctrlNoGetConfig = {
        getRequest: jest.fn(),
        getResponse: jest.fn(),
        getServiceManager: jest.fn(() => mockServiceManager),
        plugin: jest.fn(),
      };
      plugin.setController(ctrlNoGetConfig);
      expect(plugin.getConfig()).toEqual({ appName: 'test' });
      expect(mockServiceManager.get).toHaveBeenCalledWith('Config');
    });
  });

  describe('setOptions / getOptions / getOption', () => {
    it('setOptions sets options', () => {
      plugin.setOptions({ a: 1, b: 2 });
      expect(plugin.getOptions()).toEqual({ a: 1, b: 2 });
    });

    it('setOptions returns this for chaining', () => {
      expect(plugin.setOptions({})).toBe(plugin);
    });

    it('setOptions with null defaults to empty object', () => {
      plugin.setOptions(null);
      expect(plugin.getOptions()).toEqual({});
    });

    it('getOption returns value for existing key', () => {
      plugin.setOptions({ timeout: 5000 });
      expect(plugin.getOption('timeout')).toBe(5000);
    });

    it('getOption returns defaultValue for missing key', () => {
      expect(plugin.getOption('missing', 'default')).toBe('default');
    });

    it('getOption returns null as default when not specified', () => {
      expect(plugin.getOption('missing')).toBeNull();
    });
  });

  describe('lifecycle hooks', () => {
    it('preDispatch is a no-op', () => {
      expect(plugin.preDispatch()).toBeUndefined();
    });

    it('postDispatch is a no-op', () => {
      expect(plugin.postDispatch()).toBeUndefined();
    });
  });

  describe('setOptions/getOptions edge cases (lines 97, 103)', () => {
    it('setOptions(null) defaults options to empty object', () => {
      const p = new BasePlugin({ key: 'value' });
      p.setOptions(null);
      expect(p.getOptions()).toEqual({});
    });

    it('getOptions returns empty object when options property is not set', () => {
      const p = new BasePlugin();
      p.options = undefined;
      expect(p.getOptions()).toEqual({});
    });

    it('setOptions with undefined defaults to empty object (line 97)', () => {
      const p = new BasePlugin({ key: 'val' });
      p.setOptions(undefined);
      expect(p.getOptions()).toEqual({});
    });

    it('setOptions with false defaults to empty object', () => {
      const p = new BasePlugin();
      p.setOptions(false);
      expect(p.getOptions()).toEqual({});
    });

    it('setOptions with 0 defaults to empty object', () => {
      const p = new BasePlugin();
      p.setOptions(0);
      expect(p.getOptions()).toEqual({});
    });
  });
});
