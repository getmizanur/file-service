const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const EventManagerFactory = require(path.join(projectRoot, 'library/mvc/service/factory/event-manager-factory'));
const MvcEventFactory = require(path.join(projectRoot, 'library/mvc/service/factory/mvc-event-factory'));
const ApplicationFactory = require(path.join(projectRoot, 'library/mvc/service/factory/application-factory'));
const CacheManagerFactory = require(path.join(projectRoot, 'library/mvc/service/factory/cache-manager-factory'));
const PluginManagerFactory = require(path.join(projectRoot, 'library/mvc/service/factory/plugin-manager-factory'));
const ViewManagerFactory = require(path.join(projectRoot, 'library/mvc/service/factory/view-manager-factory'));
const CacheFactory = require(path.join(projectRoot, 'library/mvc/service/factory/cache-factory'));

// ─── Helpers ────────────────────────────────────────────────────────

function mockServiceManager(services = {}) {
  return {
    get(name) {
      if (name in services) return services[name];
      throw new Error(`Service "${name}" not registered`);
    }
  };
}

// ─── EventManagerFactory ────────────────────────────────────────────

describe('EventManagerFactory', () => {
  it('should create an EventManager instance', () => {
    const factory = new EventManagerFactory();
    const em = factory.createService(mockServiceManager());
    expect(em).toBeDefined();
    expect(em.listeners).toBeDefined();
  });
});

// ─── MvcEventFactory ────────────────────────────────────────────────

describe('MvcEventFactory', () => {
  it('should create an MvcEvent and set serviceManager', () => {
    const factory = new MvcEventFactory();
    const sm = mockServiceManager();
    const event = factory.createService(sm);
    expect(event).toBeDefined();
    expect(event.serviceManager).toBe(sm);
  });
});

// ─── ApplicationFactory ─────────────────────────────────────────────

describe('ApplicationFactory', () => {
  it('should throw when serviceManager is missing', () => {
    const factory = new ApplicationFactory();
    expect(() => factory.createService(null)).toThrow('serviceManager is required');
    expect(() => factory.createService(undefined)).toThrow('serviceManager is required');
  });

  it('should throw when serviceManager has no get method', () => {
    const factory = new ApplicationFactory();
    expect(() => factory.createService({})).toThrow('serviceManager is required');
  });

  it('should throw when Config service is not registered', () => {
    const factory = new ApplicationFactory();
    const sm = mockServiceManager(); // no Config
    expect(() => factory.createService(sm)).toThrow("'Config' service is not registered");
  });

  it('should throw when Config is not an object', () => {
    const factory = new ApplicationFactory();
    const sm = mockServiceManager({ Config: 'not-an-object' });
    expect(() => factory.createService(sm)).toThrow("invalid 'Config' service");
  });

  it('should throw when Config is null', () => {
    const factory = new ApplicationFactory();
    const sm = mockServiceManager({ Config: null });
    expect(() => factory.createService(sm)).toThrow("invalid 'Config' service");
  });

  it('should create an Application when Config is a valid object', () => {
    const factory = new ApplicationFactory();
    const config = { app: { name: 'test' } };
    const sm = mockServiceManager({ Config: config });
    const app = factory.createService(sm);
    expect(app).toBeDefined();
  });
});

// ─── CacheManagerFactory ────────────────────────────────────────────

describe('CacheManagerFactory', () => {
  it('should throw when serviceManager is missing', () => {
    const factory = new CacheManagerFactory();
    expect(() => factory.createService(null)).toThrow('serviceManager is required');
  });

  it('should create a CacheManager even when Config is not registered', () => {
    const factory = new CacheManagerFactory();
    const sm = mockServiceManager(); // no Config - should not throw
    const cm = factory.createService(sm);
    expect(cm).toBeDefined();
    expect(typeof cm.getCache).toBe('function');
  });

  it('should create a CacheManager with cache config from Config service', () => {
    const factory = new CacheManagerFactory();
    const sm = mockServiceManager({ Config: { cache: { enabled: true } } });
    const cm = factory.createService(sm);
    expect(cm).toBeDefined();
  });

  it('should handle non-object cache config gracefully', () => {
    const factory = new CacheManagerFactory();
    const sm = mockServiceManager({ Config: { cache: 'invalid' } });
    const cm = factory.createService(sm);
    expect(cm).toBeDefined();
  });
});

// ─── PluginManagerFactory ───────────────────────────────────────────

describe('PluginManagerFactory', () => {
  it('should throw when serviceManager is missing', () => {
    const factory = new PluginManagerFactory();
    expect(() => factory.createService(null)).toThrow('serviceManager is required');
  });

  it('should create a PluginManager even without Config service', () => {
    const factory = new PluginManagerFactory();
    const sm = mockServiceManager(); // no Config
    const pm = factory.createService(sm);
    expect(pm).toBeDefined();
  });

  it('should create a PluginManager and call setConfig when Config is available', () => {
    const factory = new PluginManagerFactory();
    const config = { controller_plugins: { invokables: {} } };
    const sm = mockServiceManager({ Config: config });
    const pm = factory.createService(sm);
    expect(pm).toBeDefined();
  });

  it('should handle Config service returning null (|| {} fallback, line 22)', () => {
    const factory = new PluginManagerFactory();
    const sm = { get: jest.fn(() => null) };
    const pm = factory.createService(sm);
    expect(pm).toBeDefined();
  });

  it('should handle pluginManager without setConfig (line 29)', () => {
    const factory = new PluginManagerFactory();
    const config = {};
    const sm = mockServiceManager({ Config: config });
    // Temporarily remove setConfig to test branch
    const PluginManager = require(path.join(projectRoot, 'library/mvc/controller/plugin-manager'));
    const origSetConfig = PluginManager.prototype.setConfig;
    delete PluginManager.prototype.setConfig;
    const pm = factory.createService(sm);
    expect(pm).toBeDefined();
    PluginManager.prototype.setConfig = origSetConfig;
  });
});

// ─── ViewManagerFactory ─────────────────────────────────────────────

describe('ViewManagerFactory', () => {
  it('should throw when serviceManager is missing', () => {
    const factory = new ViewManagerFactory();
    expect(() => factory.createService(null)).toThrow('serviceManager is required');
  });

  it('should create a ViewManager even without Config service', () => {
    const factory = new ViewManagerFactory();
    const sm = mockServiceManager(); // no Config
    const vm = factory.createService(sm);
    expect(vm).toBeDefined();
  });

  it('should use config.view_manager when available', () => {
    const factory = new ViewManagerFactory();
    const sm = mockServiceManager({
      Config: { view_manager: { not_found_template: 'custom/404' } }
    });
    const vm = factory.createService(sm);
    expect(vm.getNotFoundTemplate()).toBe('custom/404');
  });

  it('should fall back to config.application.view_manager', () => {
    const factory = new ViewManagerFactory();
    const sm = mockServiceManager({
      Config: { application: { view_manager: { exception_template: 'custom/500' } } }
    });
    const vm = factory.createService(sm);
    expect(vm.getExceptionTemplate()).toBe('custom/500');
  });

  it('should use defaults when no view_manager config exists', () => {
    const factory = new ViewManagerFactory();
    const sm = mockServiceManager({ Config: {} });
    const vm = factory.createService(sm);
    expect(vm.getNotFoundTemplate()).toBe('error/404');
  });
});

// ─── CacheFactory ───────────────────────────────────────────────────

describe('CacheFactory', () => {
  it('should throw when serviceManager is missing', () => {
    const factory = new CacheFactory();
    expect(() => factory.createService(null)).toThrow('serviceManager is required');
  });

  it('should throw when CacheManager service is not registered', () => {
    const factory = new CacheFactory();
    const sm = mockServiceManager({ Config: {} }); // no CacheManager
    expect(() => factory.createService(sm)).toThrow("'CacheManager' service is not registered");
  });

  it('should throw when CacheManager is invalid (missing getCache)', () => {
    const factory = new CacheFactory();
    const sm = mockServiceManager({ Config: {}, CacheManager: {} });
    expect(() => factory.createService(sm)).toThrow("missing getCache()");
  });

  it('should call getCache with default name "Default"', () => {
    const factory = new CacheFactory();
    const mockCache = { get: jest.fn(), set: jest.fn() };
    const cacheManager = { getCache: jest.fn().mockReturnValue(mockCache) };
    const sm = mockServiceManager({ Config: {}, CacheManager: cacheManager });

    const result = factory.createService(sm);
    expect(cacheManager.getCache).toHaveBeenCalledWith('Default');
    expect(result).toBe(mockCache);
  });

  it('should use config.cache.default_name when specified', () => {
    const factory = new CacheFactory();
    const mockCache = {};
    const cacheManager = { getCache: jest.fn().mockReturnValue(mockCache) };
    const sm = mockServiceManager({
      Config: { cache: { default_name: 'MyCache' } },
      CacheManager: cacheManager
    });

    factory.createService(sm);
    expect(cacheManager.getCache).toHaveBeenCalledWith('MyCache');
  });

  it('should use config.cache.defaultName as fallback', () => {
    const factory = new CacheFactory();
    const mockCache = {};
    const cacheManager = { getCache: jest.fn().mockReturnValue(mockCache) };
    const sm = mockServiceManager({
      Config: { cache: { defaultName: 'AltCache' } },
      CacheManager: cacheManager
    });

    factory.createService(sm);
    expect(cacheManager.getCache).toHaveBeenCalledWith('AltCache');
  });
});
