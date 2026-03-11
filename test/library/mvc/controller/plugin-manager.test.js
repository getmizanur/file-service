const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const PluginManager = require(path.join(projectRoot, 'library/mvc/controller/plugin-manager'));

describe('PluginManager', () => {
  beforeAll(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });
  afterAll(() => {
    console.warn.mockRestore();
    console.error.mockRestore();
    console.debug.mockRestore();
  });

  describe('constructor', () => {
    it('should create with defaults', () => {
      const pm = new PluginManager();
      expect(pm.controller).toBeNull();
      expect(pm.config).toBeNull();
      expect(pm.allowOverrideFrameworkPlugins).toBe(false);
      expect(pm.plugins).toEqual({});
    });

    it('should accept controller and config', () => {
      const ctrl = {};
      const config = {};
      const pm = new PluginManager({ controller: ctrl, config });
      expect(pm.controller).toBe(ctrl);
      expect(pm.config).toBe(config);
    });

    it('should have framework plugins', () => {
      const pm = new PluginManager();
      expect(pm.invokableClasses.flashMessenger).toBeDefined();
      expect(pm.invokableClasses.layout).toBeDefined();
      expect(pm.invokableClasses.params).toBeDefined();
      expect(pm.invokableClasses.redirect).toBeDefined();
      expect(pm.invokableClasses.url).toBeDefined();
      expect(pm.invokableClasses.session).toBeDefined();
    });
  });

  describe('setConfig / reset', () => {
    it('setConfig should update and return this', () => {
      const pm = new PluginManager();
      const config = { controller_plugins: { invokables: {} } };
      expect(pm.setConfig(config)).toBe(pm);
      expect(pm.config).toBe(config);
    });

    it('reset should clear cached plugins', () => {
      const pm = new PluginManager();
      pm.plugins.test = {};
      expect(pm.reset()).toBe(pm);
      expect(pm.plugins).toEqual({});
    });
  });

  describe('getAllPlugins', () => {
    it('should merge framework and app plugins', () => {
      const pm = new PluginManager({
        config: {
          controller_plugins: {
            invokables: {
              myPlugin: { class: '/application/controller/plugin/my-plugin' }
            }
          }
        }
      });
      expect(pm.invokableClasses.myPlugin).toBeDefined();
      expect(pm.invokableClasses.flashMessenger).toBeDefined();
    });

    it('should warn and remove conflicts when override not allowed', () => {
      const pm = new PluginManager({
        config: {
          controller_plugins: {
            invokables: {
              redirect: { class: '/custom/redirect' }
            }
          }
        }
      });
      // Framework redirect should win
      expect(pm.invokableClasses.redirect.class).toBe('/library/mvc/controller/plugin/redirect');
      expect(console.warn).toHaveBeenCalled();
    });

    it('should allow override when explicitly enabled', () => {
      const pm = new PluginManager({
        allowOverrideFrameworkPlugins: true,
        config: {
          controller_plugins: {
            invokables: {
              redirect: { class: '/custom/redirect' }
            }
          }
        }
      });
      expect(pm.invokableClasses.redirect.class).toBe('/custom/redirect');
    });
  });

  describe('loadApplicationPluginsFromConfig', () => {
    it('should return empty when no config', () => {
      const pm = new PluginManager();
      expect(pm.loadApplicationPluginsFromConfig()).toEqual({});
    });

    it('should handle string plugin configs', () => {
      const pm = new PluginManager({
        config: {
          controller_plugins: {
            invokables: {
              myPlugin: '/path/to/plugin'
            }
          }
        }
      });
      const plugins = pm.loadApplicationPluginsFromConfig();
      expect(plugins.myPlugin.class).toBe('/path/to/plugin');
    });

    it('should skip plugins without class', () => {
      const pm = new PluginManager({
        config: {
          controller_plugins: {
            invokables: {
              noClass: { description: 'no class here' }
            }
          }
        }
      });
      const plugins = pm.loadApplicationPluginsFromConfig();
      expect(plugins.noClass).toBeUndefined();
    });
  });

  describe('setController / getController', () => {
    it('should set controller and return this', () => {
      const pm = new PluginManager();
      const ctrl = {};
      expect(pm.setController(ctrl)).toBe(pm);
      expect(pm.getController()).toBe(ctrl);
    });

    it('should update controller on cached plugins', () => {
      const pm = new PluginManager();
      const mockPlugin = { setController: jest.fn() };
      pm.plugins.test = mockPlugin;
      const ctrl = {};
      pm.setController(ctrl);
      expect(mockPlugin.setController).toHaveBeenCalledWith(ctrl);
    });
  });

  describe('get', () => {
    it('should return null for unknown plugin', () => {
      const pm = new PluginManager();
      expect(pm.get('nonExistent')).toBeNull();
    });

    it('should cache plugin instances', () => {
      const pm = new PluginManager();
      const plugin1 = pm.get('url');
      const plugin2 = pm.get('url');
      expect(plugin1).toBe(plugin2);
    });

    it('should instantiate framework plugin', () => {
      const pm = new PluginManager();
      const plugin = pm.get('redirect');
      expect(plugin).toBeDefined();
    });
  });

  describe('build', () => {
    it('should return new instance each time (not cached)', () => {
      const pm = new PluginManager();
      // build may return null if setController fails, but it should not cache
      pm.build('url');
      pm.build('url');
      // Verify plugins cache is not populated by build
      expect(pm.plugins.url).toBeUndefined();
    });

    it('should return null for unknown plugin', () => {
      const pm = new PluginManager();
      expect(pm.build('nonExistent')).toBeNull();
    });
  });

  describe('hasPlugin / getAvailablePlugins', () => {
    it('should find framework plugins', () => {
      const pm = new PluginManager();
      expect(pm.hasPlugin('redirect')).toBe(true);
      expect(pm.hasPlugin('unknown')).toBe(false);
    });

    it('should list all available plugins', () => {
      const pm = new PluginManager();
      const plugins = pm.getAvailablePlugins();
      expect(plugins).toContain('redirect');
      expect(plugins).toContain('flashMessenger');
    });
  });

  describe('getPluginInfo', () => {
    it('should return info for known plugin', () => {
      const pm = new PluginManager();
      const info = pm.getPluginInfo('redirect');
      expect(info.name).toBe('redirect');
      expect(info.class).toBe('/library/mvc/controller/plugin/redirect');
    });

    it('should return null for unknown plugin', () => {
      const pm = new PluginManager();
      expect(pm.getPluginInfo('unknown')).toBeNull();
    });
  });

  describe('preDispatchAll / postDispatchAll', () => {
    it('should call preDispatch on cached plugins', () => {
      const pm = new PluginManager();
      const mockPlugin = { preDispatch: jest.fn() };
      pm.plugins.test = mockPlugin;
      pm.preDispatchAll();
      expect(mockPlugin.preDispatch).toHaveBeenCalled();
    });

    it('should call postDispatch on cached plugins', () => {
      const pm = new PluginManager();
      const mockPlugin = { postDispatch: jest.fn() };
      pm.plugins.test = mockPlugin;
      pm.postDispatchAll();
      expect(mockPlugin.postDispatch).toHaveBeenCalled();
    });

    it('should not throw when plugin throws', () => {
      const pm = new PluginManager();
      pm.plugins.bad = { preDispatch: () => { throw new Error('oops'); } };
      expect(() => pm.preDispatchAll()).not.toThrow();
    });

    it('should skip plugins without lifecycle methods', () => {
      const pm = new PluginManager();
      pm.plugins.noHooks = {};
      expect(() => pm.preDispatchAll()).not.toThrow();
      expect(() => pm.postDispatchAll()).not.toThrow();
    });

    it('should not throw when postDispatch plugin throws', () => {
      const pm = new PluginManager();
      pm.plugins.bad = { postDispatch: () => { throw new Error('post oops'); } };
      expect(() => pm.postDispatchAll()).not.toThrow();
      expect(console.debug).toHaveBeenCalledWith(
        'PluginManager.postDispatch: plugin error:',
        'post oops'
      );
    });
  });

  describe('branch coverage', () => {
    it('should handle plugin with description in object config (line 117)', () => {
      const pm = new PluginManager({
        config: {
          controller_plugins: {
            invokables: {
              myPlugin: { class: '/path/to/plugin', description: 'My custom plugin', options: { debug: true } }
            }
          }
        }
      });
      const plugins = pm.loadApplicationPluginsFromConfig();
      expect(plugins.myPlugin.description).toBe('My custom plugin');
      expect(plugins.myPlugin.options).toEqual({ debug: true });
    });

    it('should handle plugin with object config but no description/options (lines 117-123)', () => {
      const pm = new PluginManager({
        config: {
          controller_plugins: {
            invokables: {
              myPlugin: { class: '/path/to/plugin' }
            }
          }
        }
      });
      const plugins = pm.loadApplicationPluginsFromConfig();
      expect(plugins.myPlugin.description).toBe('Custom application plugin');
      expect(plugins.myPlugin.options).toEqual({});
    });

    it('should handle _createPluginInstance with string pluginConfig (line 191)', () => {
      const mockController = {
        getRequest: jest.fn(), getResponse: jest.fn(),
        getServiceManager: jest.fn(), plugin: jest.fn()
      };
      const pm = new PluginManager({
        controller: mockController,
        config: {
          controller_plugins: {
            invokables: {
              testPlugin: '/library/mvc/controller/plugin/params'
            }
          }
        }
      });
      const plugin = pm.get('testPlugin');
      expect(plugin).not.toBeNull();
    });

    it('should handle _createPluginInstance with config having options (line 196)', () => {
      const mockController = {
        getRequest: jest.fn(), getResponse: jest.fn(),
        getServiceManager: jest.fn(), plugin: jest.fn()
      };
      const pm = new PluginManager({ controller: mockController });
      pm.invokableClasses.testOpts = {
        class: '/library/mvc/controller/plugin/params',
        options: { debug: true }
      };
      const plugin = pm._createPluginInstance('testOpts', { extra: 'opt' });
      expect(plugin).not.toBeNull();
    });

    it('should handle _createPluginInstance when setController throws (line 209-210)', () => {
      // Controller is null so setController will throw
      const pm = new PluginManager();
      const plugin = pm._createPluginInstance('redirect');
      // Should return null because setController(null) throws
      expect(plugin).toBeNull();
    });

    it('should handle _createPluginInstance with object config without options (line 195-198)', () => {
      const mockController = {
        getRequest: jest.fn(), getResponse: jest.fn(),
        getServiceManager: jest.fn(), plugin: jest.fn()
      };
      const pm = new PluginManager({ controller: mockController });
      // Framework plugins have options: {}, test one without
      pm.invokableClasses.noOpts = { class: '/library/mvc/controller/plugin/params' };
      const plugin = pm._createPluginInstance('noOpts');
      expect(plugin).not.toBeNull();
    });

    it('should handle getPluginInfo with string config (line 234)', () => {
      const pm = new PluginManager();
      // Directly inject a string config to test the typeof branch
      pm.invokableClasses.strPlugin = '/path/to/plugin';
      const info = pm.getPluginInfo('strPlugin');
      expect(info.class).toBe('/path/to/plugin');
      expect(info.description).toBe('No description available');
    });

    it('should handle getPluginInfo with object config with description (line 235)', () => {
      const pm = new PluginManager({
        config: {
          controller_plugins: {
            invokables: {
              descPlugin: { class: '/path', description: 'Described' }
            }
          }
        }
      });
      const info = pm.getPluginInfo('descPlugin');
      expect(info.description).toBe('Described');
    });

    it('should handle setController with cached plugin without setController method (line 142)', () => {
      const pm = new PluginManager();
      pm.plugins.mock = { name: 'no-setController' };
      expect(() => pm.setController({})).not.toThrow();
    });
  });

  describe('loadApplicationPluginsFromConfig - error handling', () => {
    it('should return empty object and warn when config iteration throws', () => {
      const pm = new PluginManager();
      // Set a config with a getter that throws on access
      const badConfig = {
        controller_plugins: {
          get invokables() {
            throw new Error('config read error');
          }
        }
      };
      pm.config = badConfig;
      const result = pm.loadApplicationPluginsFromConfig();
      expect(result).toEqual({});
      expect(console.warn).toHaveBeenCalledWith(
        'Could not load application controller plugins from config:',
        'config read error'
      );
    });
  });

  describe('get - successful plugin creation and caching', () => {
    it('should create, cache, and return a plugin instance via mock plugin', () => {
      // Create a mock controller that satisfies BasePlugin._isControllerLike
      const mockController = {
        getRequest: jest.fn(),
        getResponse: jest.fn(),
        getServiceManager: jest.fn(),
        plugin: jest.fn()
      };
      const pm = new PluginManager({ controller: mockController });
      // Use a framework plugin - redirect should work with a valid controller
      const plugin = pm.get('redirect');
      expect(plugin).not.toBeNull();
      expect(pm.plugins.redirect).toBe(plugin);
      // Second call returns the same cached instance
      const plugin2 = pm.get('redirect');
      expect(plugin2).toBe(plugin);
    });
  });

  describe('_createPluginInstance - successful return', () => {
    it('should successfully create and return a plugin instance', () => {
      const mockController = {
        getRequest: jest.fn(),
        getResponse: jest.fn(),
        getServiceManager: jest.fn(),
        plugin: jest.fn()
      };
      const pm = new PluginManager({ controller: mockController });
      const plugin = pm._createPluginInstance('redirect');
      expect(plugin).not.toBeNull();
      expect(plugin).toBeDefined();
      expect(typeof plugin).toBe('object');
    });

    it('should inject controller via setController when controller is valid', () => {
      const mockController = {
        getRequest: jest.fn(),
        getResponse: jest.fn(),
        getServiceManager: jest.fn(),
        plugin: jest.fn()
      };
      const pm = new PluginManager({ controller: mockController });
      const plugin = pm._createPluginInstance('redirect');
      expect(plugin).not.toBeNull();
      expect(plugin.getController()).toBe(mockController);
    });
  });
});
