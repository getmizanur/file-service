const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const AbstractService = require(path.join(projectRoot, 'application/service/abstract-service'));

class ConcreteService extends AbstractService {
  constructor() {
    super();
  }
}

describe('AbstractService', () => {

  describe('constructor', () => {
    it('should throw TypeError when instantiated directly', () => {
      expect(() => new AbstractService()).toThrow(TypeError);
      expect(() => new AbstractService()).toThrow('Cannot construct AbstractService instances directly');
    });

    it('should allow instantiation through a concrete subclass', () => {
      const service = new ConcreteService();
      expect(service).toBeInstanceOf(AbstractService);
      expect(service).toBeInstanceOf(ConcreteService);
    });

    it('should initialize cache as empty object', () => {
      const service = new ConcreteService();
      expect(service.cache).toEqual({});
    });

    it('should initialize config as null', () => {
      const service = new ConcreteService();
      expect(service.config).toBeNull();
    });

    it('should initialize serviceManager as null', () => {
      const service = new ConcreteService();
      expect(service.serviceManager).toBeNull();
    });
  });

  describe('getServiceManager / setServiceManager', () => {
    it('should return null before setting', () => {
      const service = new ConcreteService();
      expect(service.getServiceManager()).toBeNull();
    });

    it('should set and get serviceManager', () => {
      const service = new ConcreteService();
      const mockSm = { get: jest.fn() };
      const result = service.setServiceManager(mockSm);
      expect(service.getServiceManager()).toBe(mockSm);
      expect(result).toBe(service); // chaining
    });
  });

  describe('setCache', () => {
    it('should set a cache instance for a given type', () => {
      const service = new ConcreteService();
      const mockCache = { load: jest.fn(), save: jest.fn() };
      const result = service.setCache('default', mockCache);
      expect(service.cache['default']).toBe(mockCache);
      expect(result).toBe(service); // chaining
    });

    it('should allow setting multiple cache types', () => {
      const service = new ConcreteService();
      const transientCache = { type: 'transient' };
      const persistentCache = { type: 'persistent' };
      service.setCache('transient', transientCache);
      service.setCache('persistent', persistentCache);
      expect(service.cache['transient']).toBe(transientCache);
      expect(service.cache['persistent']).toBe(persistentCache);
    });
  });

  describe('clearCaches', () => {
    it('should clear all cached instances', () => {
      const service = new ConcreteService();
      service.setCache('default', { type: 'default' });
      service.setCache('transient', { type: 'transient' });
      const result = service.clearCaches();
      expect(service.cache).toEqual({});
      expect(result).toBe(service); // chaining
    });
  });

  describe('hasTypedBackendOptions', () => {
    it('should return true when backend_options has persistent property', () => {
      const service = new ConcreteService();
      const config = { backend_options: { persistent: { server: {} } } };
      expect(service.hasTypedBackendOptions(config)).toBe(true);
    });

    it('should return true when backend_options has transient property', () => {
      const service = new ConcreteService();
      const config = { backend_options: { transient: { server: {} } } };
      expect(service.hasTypedBackendOptions(config)).toBe(true);
    });

    it('should return false when backend_options has neither persistent nor transient', () => {
      const service = new ConcreteService();
      const config = { backend_options: { host: 'localhost', port: 6379 } };
      expect(service.hasTypedBackendOptions(config)).toBe(false);
    });

    it('should return falsy when backend_options is null or undefined', () => {
      const service = new ConcreteService();
      expect(service.hasTypedBackendOptions({ backend_options: null })).toBeFalsy();
      expect(service.hasTypedBackendOptions({})).toBeFalsy();
    });
  });

  describe('loadApplicationConfig', () => {
    it('should cache config after first load', () => {
      const service = new ConcreteService();
      const config1 = service.loadApplicationConfig();
      const config2 = service.loadApplicationConfig();
      expect(config1).toBe(config2);
    });
  });

  describe('getAvailableCacheTypes', () => {
    let service;

    beforeEach(() => {
      service = new ConcreteService();
    });

    it('should return empty array when cache is disabled', () => {
      service.config = { cache: { enabled: false } };
      expect(service.getAvailableCacheTypes()).toEqual([]);
    });

    it('should return empty array when cache config is missing', () => {
      service.config = { cache: {} };
      expect(service.getAvailableCacheTypes()).toEqual([]);
    });

    it('should return typed types when backend_options has persistent/transient', () => {
      service.config = {
        cache: {
          enabled: true,
          backend_options: {
            persistent: { server: {} },
            transient: { server: {} }
          }
        }
      };
      const types = service.getAvailableCacheTypes();
      expect(types).toContain('persistent');
      expect(types).toContain('transient');
    });

    it('should return only configured typed types', () => {
      service.config = {
        cache: {
          enabled: true,
          backend_options: {
            persistent: { server: {} }
          }
        }
      };
      const types = service.getAvailableCacheTypes();
      expect(types).toEqual(['persistent']);
    });

    it('should return all types for single config', () => {
      service.config = {
        cache: {
          enabled: true,
          backend_options: { host: 'localhost', port: 6379 }
        }
      };
      const types = service.getAvailableCacheTypes();
      expect(types).toEqual(['default', 'transient', 'persistent']);
    });
  });

  describe('hasCacheType', () => {
    let service;

    beforeEach(() => {
      service = new ConcreteService();
    });

    it('should return false when cache is disabled', () => {
      service.config = { cache: { enabled: false } };
      expect(service.hasCacheType('default')).toBe(false);
    });

    it('should return true for available cache type', () => {
      service.config = {
        cache: {
          enabled: true,
          backend_options: { host: 'localhost' }
        }
      };
      expect(service.hasCacheType('default')).toBe(true);
    });

    it('should return false for unavailable cache type', () => {
      service.config = {
        cache: {
          enabled: true,
          backend_options: { persistent: { server: {} } }
        }
      };
      expect(service.hasCacheType('default')).toBe(false);
    });
  });

  describe('getCache', () => {
    let service;

    beforeEach(() => {
      service = new ConcreteService();
    });

    it('should return existing cache instance if already created', () => {
      const mockCache = { load: jest.fn() };
      service.setCache('default', mockCache);
      expect(service.getCache('default')).toBe(mockCache);
    });

    it('should return null when cache is disabled', () => {
      service.config = {
        cache: { enabled: false }
      };
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      const result = service.getCache();
      expect(result).toBeNull();
      spy.mockRestore();
    });
  });

  describe('_resolveBackendOptions', () => {
    let service;

    beforeEach(() => {
      service = new ConcreteService();
    });

    it('should resolve typed backend options for transient type', () => {
      const cacheConfig = {
        frontend_options: { lifetime: 120 },
        backend_options: {
          transient: { server: { ttl: 60 } },
          persistent: { server: { ttl: 3600 } }
        }
      };
      const result = service._resolveBackendOptions(cacheConfig, 'transient');
      expect(result.backendOptions).toEqual({ server: { ttl: 60 } });
      expect(result.frontendOptions.lifetime).toBe(60);
    });

    it('should resolve typed backend options for persistent type', () => {
      const cacheConfig = {
        frontend_options: { lifetime: 120 },
        backend_options: {
          transient: { server: { ttl: 60 } },
          persistent: { server: { ttl: 3600 } }
        }
      };
      const result = service._resolveBackendOptions(cacheConfig, 'persistent');
      expect(result.backendOptions).toEqual({ server: { ttl: 3600 } });
      expect(result.frontendOptions.lifetime).toBe(3600);
    });

    it('should throw for invalid type with typed backend options', () => {
      const cacheConfig = {
        frontend_options: { lifetime: 120 },
        backend_options: {
          transient: { server: {} },
          persistent: { server: {} }
        }
      };
      expect(() => service._resolveBackendOptions(cacheConfig, 'default')).toThrow('Invalid cache type');
    });

    it('should resolve single backend options for default type', () => {
      const cacheConfig = {
        frontend_options: { lifetime: 120 },
        backend_options: { host: 'localhost', key_prefix: 'app_' }
      };
      const result = service._resolveBackendOptions(cacheConfig, 'default');
      expect(result.backendOptions.host).toBe('localhost');
      expect(result.frontendOptions.lifetime).toBe(120);
    });

    it('should adjust TTL and prefix for transient with single config', () => {
      const cacheConfig = {
        frontend_options: { lifetime: 120 },
        backend_options: { host: 'localhost', key_prefix: 'app_' }
      };
      const result = service._resolveBackendOptions(cacheConfig, 'transient');
      expect(result.frontendOptions.lifetime).toBe(60); // half
      expect(result.backendOptions.key_prefix).toBe('app_transient_');
    });

    it('should adjust TTL and prefix for persistent with single config', () => {
      const cacheConfig = {
        frontend_options: { lifetime: 120 },
        backend_options: { host: 'localhost', key_prefix: 'app_' }
      };
      const result = service._resolveBackendOptions(cacheConfig, 'persistent');
      expect(result.frontendOptions.lifetime).toBe(240); // double
      expect(result.backendOptions.key_prefix).toBe('app_persistent_');
    });

    it('should not override lifetime when typed backend has no server.ttl', () => {
      const cacheConfig = {
        frontend_options: { lifetime: 120 },
        backend_options: {
          transient: { host: 'localhost' }
        }
      };
      const result = service._resolveBackendOptions(cacheConfig, 'transient');
      expect(result.frontendOptions.lifetime).toBe(120);
    });

    it('should use default key_prefix when not set in single config transient', () => {
      const cacheConfig = {
        frontend_options: { lifetime: 100 },
        backend_options: { host: 'localhost' }
      };
      const result = service._resolveBackendOptions(cacheConfig, 'transient');
      expect(result.backendOptions.key_prefix).toBe('myapp_transient_');
    });

    it('should use default key_prefix when not set in single config persistent', () => {
      const cacheConfig = {
        frontend_options: { lifetime: 100 },
        backend_options: { host: 'localhost' }
      };
      const result = service._resolveBackendOptions(cacheConfig, 'persistent');
      expect(result.backendOptions.key_prefix).toBe('myapp_persistent_');
    });

    it('should throw for invalid type with single backend', () => {
      const cacheConfig = {
        frontend_options: { lifetime: 120 },
        backend_options: { host: 'localhost' }
      };
      expect(() => service._resolveBackendOptions(cacheConfig, 'invalid_type')).toThrow('Invalid cache type');
    });

    it('should throw when typed backend type is missing from config', () => {
      const cacheConfig = {
        frontend_options: { lifetime: 120 },
        backend_options: {
          persistent: { server: {} }
        }
      };
      expect(() => service._resolveBackendOptions(cacheConfig, 'transient')).toThrow('Cache backend options not found');
    });
  });
});
