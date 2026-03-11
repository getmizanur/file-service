const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const QueryCacheService = require(path.join(projectRoot, 'application/service/domain/query-cache-domain-service'));
const AbstractService = require(path.join(projectRoot, 'application/service/abstract-service'));

describe('QueryCacheService', () => {
  let service;

  beforeEach(() => {
    service = new QueryCacheService();
  });

  describe('constructor', () => {
    it('should be an instance of AbstractService (not AbstractDomainService)', () => {
      expect(service).toBeInstanceOf(AbstractService);
    });

    it('should initialize _emailHashes as empty object', () => {
      expect(service._emailHashes).toEqual({});
    });
  });

  describe('emailHash', () => {
    it('should return md5 hash of email', () => {
      const crypto = require('node:crypto');
      const expected = crypto.createHash('md5').update('test@example.com').digest('hex');
      expect(service.emailHash('test@example.com')).toBe(expected);
    });

    it('should cache hash results', () => {
      const hash1 = service.emailHash('test@example.com');
      const hash2 = service.emailHash('test@example.com');
      expect(hash1).toBe(hash2);
      expect(service._emailHashes['test@example.com']).toBe(hash1);
    });

    it('should produce different hashes for different emails', () => {
      const hash1 = service.emailHash('alice@example.com');
      const hash2 = service.emailHash('bob@example.com');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('cacheThrough', () => {
    it('should call queryFn directly when cache is not available', async () => {
      service.config = { cache: { enabled: false } };
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      const queryFn = jest.fn().mockResolvedValue('fresh data');
      const result = await service.cacheThrough('key1', queryFn);
      expect(result).toBe('fresh data');
      expect(queryFn).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should return cached data on hit', async () => {
      const mockCache = {
        load: jest.fn().mockResolvedValue('cached data'),
        save: jest.fn()
      };
      service.setCache('default', mockCache);
      service.setServiceManager({ has: jest.fn().mockReturnValue(false), get: jest.fn() });
      const queryFn = jest.fn();
      const result = await service.cacheThrough('key1', queryFn);
      expect(result).toBe('cached data');
      expect(queryFn).not.toHaveBeenCalled();
    });

    it('should call queryFn and save on cache miss', async () => {
      const mockCache = {
        load: jest.fn().mockResolvedValue(false),
        save: jest.fn().mockResolvedValue(true)
      };
      service.setCache('default', mockCache);
      service.setServiceManager({ has: jest.fn().mockReturnValue(false), get: jest.fn() });
      const queryFn = jest.fn().mockResolvedValue('fresh data');
      const result = await service.cacheThrough('key1', queryFn);
      expect(result).toBe('fresh data');
      expect(queryFn).toHaveBeenCalled();
      expect(mockCache.save).toHaveBeenCalledWith('fresh data', 'key1', 120);
    });

    it('should use custom ttl when specified', async () => {
      const mockCache = {
        load: jest.fn().mockResolvedValue(false),
        save: jest.fn().mockResolvedValue(true)
      };
      service.setCache('default', mockCache);
      service.setServiceManager({ has: jest.fn().mockReturnValue(false), get: jest.fn() });
      await service.cacheThrough('key1', () => 'data', { ttl: 300 });
      expect(mockCache.save).toHaveBeenCalledWith('data', 'key1', 300);
    });
  });

  describe('flush', () => {
    it('should remove all keys tracked by registries', async () => {
      const mockCache = {
        load: jest.fn().mockImplementation((key) => {
          if (key === 'reg1') return Promise.resolve(['key1', 'key2']);
          return Promise.resolve(null);
        }),
        remove: jest.fn().mockResolvedValue(true)
      };
      service.setCache('default', mockCache);
      await service.flush(['reg1']);
      expect(mockCache.remove).toHaveBeenCalledWith('key1');
      expect(mockCache.remove).toHaveBeenCalledWith('key2');
      expect(mockCache.remove).toHaveBeenCalledWith('reg1');
    });

    it('should do nothing when cache is not available', async () => {
      service.config = { cache: { enabled: false } };
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      await expect(service.flush(['reg1'])).resolves.toBeUndefined();
      spy.mockRestore();
    });
  });

  describe('event-based invalidation', () => {
    let mockCache;

    beforeEach(() => {
      mockCache = {
        load: jest.fn().mockResolvedValue(null),
        remove: jest.fn().mockResolvedValue(true)
      };
      service.setCache('default', mockCache);
    });

    it('onFileChanged should flush tenant registry', async () => {
      await service.onFileChanged('t1');
      expect(mockCache.remove).toHaveBeenCalledWith('registry:tenant:t1');
    });

    it('onFolderChanged should flush tenant and user registries', async () => {
      await service.onFolderChanged('t1', 'test@example.com');
      expect(mockCache.remove).toHaveBeenCalledWith('registry:tenant:t1');
      const emailHash = service.emailHash('test@example.com');
      expect(mockCache.remove).toHaveBeenCalledWith(`registry:user:${emailHash}`);
    });

    it('onPermissionChanged should flush tenant registry', async () => {
      await service.onPermissionChanged('t1');
      expect(mockCache.remove).toHaveBeenCalledWith('registry:tenant:t1');
    });

    it('onStarChanged should flush user registry', async () => {
      await service.onStarChanged('test@example.com');
      const emailHash = service.emailHash('test@example.com');
      expect(mockCache.remove).toHaveBeenCalledWith(`registry:user:${emailHash}`);
    });
  });

  describe('_recordCacheOp', () => {
    it('should not throw when serviceManager is not set', () => {
      expect(() => service._recordCacheOp('key1', true)).not.toThrow();
    });

    it('should record cache op when profiler is available and enabled', () => {
      const mockProfiler = {
        isEnabled: jest.fn().mockReturnValue(true),
        recordCacheOp: jest.fn()
      };
      service.setServiceManager({
        has: jest.fn().mockReturnValue(true),
        get: jest.fn().mockReturnValue(mockProfiler)
      });
      service._recordCacheOp('key1', true);
      expect(mockProfiler.recordCacheOp).toHaveBeenCalledWith('key1', true);
    });

    it('should not record when profiler is disabled', () => {
      const mockProfiler = {
        isEnabled: jest.fn().mockReturnValue(false),
        recordCacheOp: jest.fn()
      };
      service.setServiceManager({
        has: jest.fn().mockReturnValue(true),
        get: jest.fn().mockReturnValue(mockProfiler)
      });
      service._recordCacheOp('key1', true);
      expect(mockProfiler.recordCacheOp).not.toHaveBeenCalled();
    });

    it('should not record when Profiler service not registered', () => {
      service.setServiceManager({
        has: jest.fn().mockReturnValue(false),
        get: jest.fn()
      });
      expect(() => service._recordCacheOp('key1', false)).not.toThrow();
    });
  });

  describe('_addToRegistry', () => {
    it('should do nothing when cache is not available', async () => {
      service.config = { cache: { enabled: false } };
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      await expect(service._addToRegistry('reg', 'key')).resolves.toBeUndefined();
      spy.mockRestore();
    });

    it('should create new registry if not exists', async () => {
      const mockCache = {
        load: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockResolvedValue(true)
      };
      service.setCache('default', mockCache);
      await service._addToRegistry('reg1', 'key1');
      expect(mockCache.save).toHaveBeenCalledWith(['key1'], 'reg1', 86400);
    });

    it('should append to existing registry', async () => {
      const mockCache = {
        load: jest.fn().mockResolvedValue(['existing-key']),
        save: jest.fn().mockResolvedValue(true)
      };
      service.setCache('default', mockCache);
      await service._addToRegistry('reg1', 'new-key');
      expect(mockCache.save).toHaveBeenCalledWith(['existing-key', 'new-key'], 'reg1', 86400);
    });

    it('should not add duplicate entry', async () => {
      const mockCache = {
        load: jest.fn().mockResolvedValue(['key1']),
        save: jest.fn().mockResolvedValue(true)
      };
      service.setCache('default', mockCache);
      await service._addToRegistry('reg1', 'key1');
      expect(mockCache.save).not.toHaveBeenCalled();
    });
  });

  describe('cacheThrough with registries', () => {
    it('should add cache key to provided registries on miss', async () => {
      const mockCache = {
        load: jest.fn().mockResolvedValue(false),
        save: jest.fn().mockResolvedValue(true)
      };
      service.setCache('default', mockCache);
      service.setServiceManager({ has: jest.fn().mockReturnValue(false), get: jest.fn() });

      // _addToRegistry calls cache.load then cache.save for registry
      mockCache.load.mockResolvedValueOnce(false) // cache miss for key
        .mockResolvedValueOnce(null) // registry1 load
        .mockResolvedValueOnce(null); // registry2 load

      await service.cacheThrough('key1', () => 'data', { registries: ['reg1', 'reg2'] });
      // save called for: data, reg1 entries, reg2 entries
      expect(mockCache.save).toHaveBeenCalledTimes(3);
    });
  });

  describe('onFolderChanged', () => {
    it('should flush only tenant registry when no email', async () => {
      const mockCache = {
        load: jest.fn().mockResolvedValue(null),
        remove: jest.fn().mockResolvedValue(true)
      };
      service.setCache('default', mockCache);
      await service.onFolderChanged('t1', null);
      expect(mockCache.remove).toHaveBeenCalledWith('registry:tenant:t1');
      expect(mockCache.remove).toHaveBeenCalledTimes(1);
    });
  });

  describe('flush edge cases', () => {
    it('should handle non-array entries in registry', async () => {
      const mockCache = {
        load: jest.fn().mockResolvedValue('not-an-array'),
        remove: jest.fn().mockResolvedValue(true)
      };
      service.setCache('default', mockCache);
      await service.flush(['reg1']);
      // Should only remove the registry key itself, not iterate non-array
      expect(mockCache.remove).toHaveBeenCalledWith('reg1');
      expect(mockCache.remove).toHaveBeenCalledTimes(1);
    });
  });
});
