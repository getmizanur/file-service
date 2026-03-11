const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const CacheManager = require(path.join(projectRoot, 'library/cache/cache-manager'));
const NullCache = require(path.join(projectRoot, 'library/cache/null-cache'));

describe('CacheManager', () => {

  describe('constructor', () => {
    it('should initialize with default empty config', () => {
      const cm = new CacheManager();
      expect(cm.config).toEqual({});
      expect(cm.instances).toEqual({});
      expect(cm.serviceManager).toBeNull();
    });

    it('should accept config and serviceManager', () => {
      const config = { enabled: true };
      const sm = { get: jest.fn() };
      const cm = new CacheManager(config, sm);
      expect(cm.config).toBe(config);
      expect(cm.serviceManager).toBe(sm);
    });

    it('should default null config to empty object', () => {
      const cm = new CacheManager(null);
      expect(cm.config).toEqual({});
    });
  });

  describe('setServiceManager / getServiceManager', () => {
    it('should set and get the service manager', () => {
      const cm = new CacheManager();
      const sm = { get: jest.fn() };
      const result = cm.setServiceManager(sm);
      expect(result).toBe(cm);
      expect(cm.getServiceManager()).toBe(sm);
    });

    it('should set null when falsy value provided', () => {
      const cm = new CacheManager({}, { get: jest.fn() });
      cm.setServiceManager(null);
      expect(cm.getServiceManager()).toBeNull();
    });
  });

  describe('hasCache()', () => {
    it('should return true for single-cache config (no caches map)', () => {
      const cm = new CacheManager({ enabled: true });
      expect(cm.hasCache('Default')).toBe(true);
      expect(cm.hasCache('Anything')).toBe(true);
    });

    it('should return true when named cache exists in caches map', () => {
      const cm = new CacheManager({
        enabled: true,
        caches: { Metadata: { backend: 'File' } }
      });
      expect(cm.hasCache('Metadata')).toBe(true);
    });

    it('should return true when Default exists in caches map even if requested name does not', () => {
      const cm = new CacheManager({
        enabled: true,
        caches: { Default: { backend: 'File' } }
      });
      expect(cm.hasCache('NonExistent')).toBe(true);
    });

    it('should return false when named cache and Default both missing from caches map', () => {
      const cm = new CacheManager({
        enabled: true,
        caches: { Metadata: { backend: 'File' } }
      });
      expect(cm.hasCache('NonExistent')).toBe(false);
    });

    it('should default name to "Default"', () => {
      const cm = new CacheManager({
        enabled: true,
        caches: { Default: { backend: 'File' } }
      });
      expect(cm.hasCache()).toBe(true);
    });
  });

  describe('getCache()', () => {
    it('should return NullCache when enabled is false', () => {
      const cm = new CacheManager({ enabled: false });
      const cache = cm.getCache('Default');
      expect(cache).toBeInstanceOf(NullCache);
    });

    it('should cache and return same instance on second call', () => {
      const cm = new CacheManager({ enabled: false });
      const first = cm.getCache('Default');
      const second = cm.getCache('Default');
      expect(first).toBe(second);
    });

    it('should return NullCache when named cache has enabled=false', () => {
      const cm = new CacheManager({
        enabled: true,
        caches: {
          Test: { enabled: false }
        }
      });
      const cache = cm.getCache('Test');
      expect(cache).toBeInstanceOf(NullCache);
    });

    it('should default name to "Default" when called with no arguments', () => {
      const cm = new CacheManager({ enabled: false });
      const cache = cm.getCache();
      expect(cache).toBeInstanceOf(NullCache);
      expect(cm.instances).toHaveProperty('Default');
    });

    it('should default name to "Default" when called with null', () => {
      const cm = new CacheManager({ enabled: false });
      const cache = cm.getCache(null);
      expect(cache).toBeInstanceOf(NullCache);
      expect(cm.instances).toHaveProperty('Default');
    });
  });

  describe('clearCache()', () => {
    it('should remove a cached instance', () => {
      const cm = new CacheManager({ enabled: false });
      cm.getCache('Default');
      expect(cm.instances).toHaveProperty('Default');
      const result = cm.clearCache('Default');
      expect(result).toBe(cm);
      expect(cm.instances).not.toHaveProperty('Default');
    });

    it('should default name to "Default"', () => {
      const cm = new CacheManager({ enabled: false });
      cm.getCache('Default');
      cm.clearCache();
      expect(cm.instances).not.toHaveProperty('Default');
    });
  });

  describe('clearAll()', () => {
    it('should remove all cached instances', () => {
      const cm = new CacheManager({ enabled: false });
      cm.getCache('Default');
      cm.getCache('Other');
      expect(Object.keys(cm.instances).length).toBe(2);
      const result = cm.clearAll();
      expect(result).toBe(cm);
      expect(cm.instances).toEqual({});
    });
  });

  describe('getCache() - enabled with backend', () => {
    it('should create real cache instance when enabled with File backend', () => {
      const cm = new CacheManager({
        enabled: true,
        frontend: 'Core',
        backend: 'File',
        frontend_options: { lifetime: 300 },
        backend_options: { cache_dir: '/tmp/test-cache' }
      });
      const cache = cm.getCache('Default');
      expect(cache).toBeDefined();
      expect(cache).not.toBeInstanceOf(NullCache);
    });

    it('should create cache from named caches config', () => {
      const cm = new CacheManager({
        enabled: true,
        caches: {
          MyCache: {
            frontend: 'Core',
            backend: 'File',
            frontend_options: { lifetime: 60 },
            backend_options: { cache_dir: '/tmp/test-cache2' }
          }
        }
      });
      const cache = cm.getCache('MyCache');
      expect(cache).toBeDefined();
      expect(cache).not.toBeInstanceOf(NullCache);
    });
  });

  describe('_resolveConfig()', () => {
    it('should return single cache config when no caches map', () => {
      const cm = new CacheManager({
        enabled: true,
        frontend: 'Core',
        backend: 'File',
        frontend_options: { lifetime: 300 },
        backend_options: { cache_dir: '/tmp' }
      });
      const cfg = cm._resolveConfig('Default');
      expect(cfg).toEqual({
        enabled: true,
        frontend: 'Core',
        backend: 'File',
        frontend_options: { lifetime: 300 },
        backend_options: { cache_dir: '/tmp' }
      });
    });

    it('should default enabled to true when not specified', () => {
      const cm = new CacheManager({});
      const cfg = cm._resolveConfig('Default');
      expect(cfg.enabled).toBe(true);
    });

    it('should merge named cache config with global config', () => {
      const cm = new CacheManager({
        enabled: true,
        frontend: 'Core',
        backend: 'File',
        frontend_options: { lifetime: 300 },
        backend_options: { cache_dir: '/tmp' },
        caches: {
          Metadata: {
            backend: 'Memory',
            backend_options: { max_entries: 100 }
          }
        }
      });
      const cfg = cm._resolveConfig('Metadata');
      expect(cfg.backend).toBe('Memory');
      expect(cfg.frontend).toBe('Core');
      expect(cfg.backend_options).toEqual({ cache_dir: '/tmp', max_entries: 100 });
    });

    it('should fall back to Default named cache when requested name not found', () => {
      const cm = new CacheManager({
        enabled: true,
        caches: {
          Default: { frontend: 'Core', backend: 'File' }
        }
      });
      const cfg = cm._resolveConfig('NonExistent');
      expect(cfg.frontend).toBe('Core');
      expect(cfg.backend).toBe('File');
    });

    it('should return empty defaults when named cache and Default both missing', () => {
      const cm = new CacheManager({
        enabled: true,
        caches: {
          Metadata: { backend: 'Memory' }
        }
      });
      const cfg = cm._resolveConfig('NonExistent');
      expect(cfg.enabled).toBe(true);
      expect(cfg.frontend).toBeUndefined();
      expect(cfg.backend).toBeUndefined();
    });

    it('should handle array value in caches map gracefully', () => {
      const cm = new CacheManager({
        enabled: true,
        caches: {
          Bad: [1, 2, 3]
        }
      });
      const cfg = cm._resolveConfig('Bad');
      expect(cfg.enabled).toBe(true);
    });
  });
});
