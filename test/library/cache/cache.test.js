const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const Cache = require(global.applicationPath('/library/cache/cache'));

describe('Cache', () => {

  // ============================================================
  // Constructor
  // ============================================================
  describe('constructor', () => {
    it('should set backend and default options', () => {
      const mockBackend = { name: 'mock' };
      const cache = new Cache(mockBackend);

      expect(cache.backend).toBe(mockBackend);
      expect(cache.options.lifetime).toBe(7200);
      expect(cache.options.automatic_serialization).toBe(true);
      expect(cache.options.debug).toBe(false);
    });

    it('should merge custom options with defaults', () => {
      const cache = new Cache({}, { lifetime: 3600, debug: true });

      expect(cache.options.lifetime).toBe(3600);
      expect(cache.options.debug).toBe(true);
      expect(cache.options.automatic_serialization).toBe(true);
    });
  });

  // ============================================================
  // factory
  // ============================================================
  describe('factory', () => {
    it('should throw when backend is missing', () => {
      expect(() => Cache.factory('Core', null)).toThrow('Cache backend name is required');
    });

    it('should throw when backend is not a string', () => {
      expect(() => Cache.factory('Core', 123)).toThrow('Cache backend name is required');
    });

    it('should throw when backend is empty string', () => {
      expect(() => Cache.factory('Core', '')).toThrow('Cache backend name is required');
    });

    it('should throw for unknown backend', () => {
      expect(() => Cache.factory('Core', 'NonExistentBackend123')).toThrow(
        /Cache backend 'NonExistentBackend123' not found or failed to load/
      );
    });
  });

  // ============================================================
  // _normalizeRecord
  // ============================================================
  describe('_normalizeRecord', () => {
    let cache;

    beforeEach(() => {
      cache = new Cache({});
    });

    it('should return null for null input', () => {
      expect(cache._normalizeRecord(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(cache._normalizeRecord(undefined)).toBeNull();
    });

    it('should return null for non-object input', () => {
      expect(cache._normalizeRecord('string')).toBeNull();
      expect(cache._normalizeRecord(42)).toBeNull();
    });

    it('should normalize record with content field', () => {
      const record = { content: 'hello', created: 1000, expires: 2000 };
      const result = cache._normalizeRecord(record);

      expect(result.content).toBe('hello');
      expect(result.created).toBe(1000);
      expect(result.expires).toBe(2000);
    });

    it('should wrap object without content field as content', () => {
      const record = { foo: 'bar' };
      const result = cache._normalizeRecord(record);

      expect(result.content).toBe(record);
      expect(result.created).toBeDefined();
      expect(result.expires).toBe(0);
    });

    it('should use created_dt fallback when created is absent', () => {
      const record = { foo: 'bar', created_dt: 5000 };
      const result = cache._normalizeRecord(record);

      expect(result.created).toBe(5000);
    });

    it('should use expires_at fallback when expires is absent', () => {
      const record = { foo: 'bar', expires_at: 9000 };
      const result = cache._normalizeRecord(record);

      expect(result.expires).toBe(9000);
    });
  });

  // ============================================================
  // _isExpired
  // ============================================================
  describe('_isExpired', () => {
    let cache;

    beforeEach(() => {
      cache = new Cache({});
    });

    it('should return false for null record', () => {
      expect(cache._isExpired(null)).toBe(false);
    });

    it('should return false when expires is 0', () => {
      expect(cache._isExpired({ expires: 0 })).toBe(false);
    });

    it('should return true when expires is in the past (number)', () => {
      expect(cache._isExpired({ expires: 1 })).toBe(true);
    });

    it('should return false when expires is in the future (number)', () => {
      expect(cache._isExpired({ expires: Date.now() + 100000 })).toBe(false);
    });

    it('should handle string date for expires', () => {
      const pastDate = new Date(Date.now() - 100000).toISOString();
      expect(cache._isExpired({ expires: pastDate })).toBe(true);
    });
  });

  // ============================================================
  // _deserialize
  // ============================================================
  describe('_deserialize', () => {
    it('should parse JSON string when automatic_serialization is true', () => {
      const cache = new Cache({}, { automatic_serialization: true });
      const result = cache._deserialize('{"key":"value"}');
      expect(result).toEqual({ key: 'value' });
    });

    it('should return raw string when JSON is invalid', () => {
      const cache = new Cache({}, { automatic_serialization: true });
      const result = cache._deserialize('not-json');
      expect(result).toBe('not-json');
    });

    it('should return content as-is when automatic_serialization is false', () => {
      const cache = new Cache({}, { automatic_serialization: false });
      const result = cache._deserialize('{"key":"value"}');
      expect(result).toBe('{"key":"value"}');
    });

    it('should return non-string content as-is', () => {
      const cache = new Cache({}, { automatic_serialization: true });
      const obj = { key: 'value' };
      const result = cache._deserialize(obj);
      expect(result).toBe(obj);
    });
  });

  // ============================================================
  // load (with mock backend)
  // ============================================================
  describe('load', () => {
    it('should return false when backend returns false', async () => {
      const mockBackend = { load: jest.fn().mockResolvedValue(false) };
      const cache = new Cache(mockBackend);

      const result = await cache.load('test_id');
      expect(result).toBe(false);
      expect(mockBackend.load).toHaveBeenCalledWith('test_id');
    });

    it('should return deserialized content from backend', async () => {
      const mockBackend = {
        load: jest.fn().mockResolvedValue({
          content: '{"name":"cached"}',
          created: Date.now(),
          expires: Date.now() + 100000
        })
      };
      const cache = new Cache(mockBackend);

      const result = await cache.load('test_id');
      expect(result).toEqual({ name: 'cached' });
    });

    it('should return false and remove expired entries', async () => {
      const mockBackend = {
        load: jest.fn().mockResolvedValue({
          content: 'data',
          created: 1000,
          expires: 1 // far in the past
        }),
        remove: jest.fn().mockResolvedValue(true)
      };
      const cache = new Cache(mockBackend);

      const result = await cache.load('expired_id');
      expect(result).toBe(false);
      expect(mockBackend.remove).toHaveBeenCalledWith('expired_id');
    });

    it('should return false on backend error', async () => {
      const mockBackend = { load: jest.fn().mockRejectedValue(new Error('fail')) };
      const cache = new Cache(mockBackend);

      const result = await cache.load('err_id');
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // save (with mock backend)
  // ============================================================
  describe('save', () => {
    it('should serialize and delegate to backend', async () => {
      const mockBackend = { save: jest.fn().mockResolvedValue(true) };
      const cache = new Cache(mockBackend);

      const result = await cache.save({ key: 'val' }, 'save_id');
      expect(result).toBe(true);
      expect(mockBackend.save).toHaveBeenCalled();

      const callArgs = mockBackend.save.mock.calls[0];
      expect(callArgs[1]).toBe('save_id');
      // content should be serialized JSON
      expect(JSON.parse(callArgs[0].content)).toEqual({ key: 'val' });
    });

    it('should use specific lifetime when provided', async () => {
      const mockBackend = { save: jest.fn().mockResolvedValue(true) };
      const cache = new Cache(mockBackend);

      await cache.save('data', 'id', 60);
      const callArgs = mockBackend.save.mock.calls[0];
      // ttl passed as 4th argument
      expect(callArgs[3]).toBe(60);
    });

    it('should not serialize string data', async () => {
      const mockBackend = { save: jest.fn().mockResolvedValue(true) };
      const cache = new Cache(mockBackend);

      await cache.save('plain text', 'id');
      const callArgs = mockBackend.save.mock.calls[0];
      expect(callArgs[0].content).toBe('plain text');
    });

    it('should return false on backend error', async () => {
      const mockBackend = { save: jest.fn().mockRejectedValue(new Error('fail')) };
      const cache = new Cache(mockBackend);

      const result = await cache.save('data', 'id');
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // remove (with mock backend)
  // ============================================================
  describe('remove', () => {
    it('should delegate to backend', async () => {
      const mockBackend = { remove: jest.fn().mockResolvedValue(true) };
      const cache = new Cache(mockBackend);

      const result = await cache.remove('rm_id');
      expect(result).toBe(true);
      expect(mockBackend.remove).toHaveBeenCalledWith('rm_id');
    });

    it('should return false on backend error', async () => {
      const mockBackend = { remove: jest.fn().mockRejectedValue(new Error('fail')) };
      const cache = new Cache(mockBackend);

      const result = await cache.remove('rm_id');
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // clean (with mock backend)
  // ============================================================
  describe('clean', () => {
    it('should delegate to backend with mode and tags', async () => {
      const mockBackend = { clean: jest.fn().mockResolvedValue(true) };
      const cache = new Cache(mockBackend);

      const result = await cache.clean('all', ['tag1']);
      expect(result).toBe(true);
      expect(mockBackend.clean).toHaveBeenCalledWith('all', ['tag1']);
    });

    it('should default to mode all and empty tags', async () => {
      const mockBackend = { clean: jest.fn().mockResolvedValue(true) };
      const cache = new Cache(mockBackend);

      await cache.clean();
      expect(mockBackend.clean).toHaveBeenCalledWith('all', []);
    });

    it('should return false on backend error', async () => {
      const mockBackend = { clean: jest.fn().mockRejectedValue(new Error('fail')) };
      const cache = new Cache(mockBackend);

      const result = await cache.clean();
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // test (existence check)
  // ============================================================
  describe('test', () => {
    it('should return false when entry does not exist', async () => {
      const mockBackend = { load: jest.fn().mockResolvedValue(false) };
      const cache = new Cache(mockBackend);

      const result = await cache.test('missing');
      expect(result).toBe(false);
    });

    it('should return created timestamp when entry exists and is valid', async () => {
      const created = Date.now();
      const mockBackend = {
        load: jest.fn().mockResolvedValue({
          content: 'data',
          created,
          expires: Date.now() + 100000
        })
      };
      const cache = new Cache(mockBackend);

      const result = await cache.test('exists');
      expect(result).toBe(created);
    });

    it('should return false and remove expired entries', async () => {
      const mockBackend = {
        load: jest.fn().mockResolvedValue({
          content: 'data',
          created: 1000,
          expires: 1
        }),
        remove: jest.fn().mockResolvedValue(true)
      };
      const cache = new Cache(mockBackend);

      const result = await cache.test('expired');
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // getStats
  // ============================================================
  describe('getStats', () => {
    it('should delegate to backend getStats when available', () => {
      const mockBackend = {
        getStats: jest.fn().mockReturnValue({ hits: 10, misses: 2 }),
        constructor: { name: 'MockBackend' }
      };
      const cache = new Cache(mockBackend);

      const stats = cache.getStats();
      expect(stats).toEqual({ hits: 10, misses: 2 });
    });

    it('should return fallback message when backend has no getStats', () => {
      class SimpleBackend {}
      const cache = new Cache(new SimpleBackend());

      const stats = cache.getStats();
      expect(stats.backend).toBe('SimpleBackend');
      expect(stats.message).toContain('not available');
    });
  });

  // ============================================================
  // getBackend
  // ============================================================
  describe('getBackend', () => {
    it('should return backend constructor name', () => {
      class FileBackend {}
      const cache = new Cache(new FileBackend());

      expect(cache.getBackend()).toBe('FileBackend');
    });
  });

  // ============================================================
  // _log / _warn (debug mode)
  // ============================================================
  describe('_log and _warn', () => {
    it('should call console.debug when debug is true', () => {
      const cache = new Cache({}, { debug: true });
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      cache._log('test message');
      expect(spy).toHaveBeenCalledWith('[Cache]', 'test message');
      spy.mockRestore();
    });

    it('should not call console.debug when debug is false', () => {
      const cache = new Cache({}, { debug: false });
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      cache._log('test message');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should call console.warn when debug is true', () => {
      const cache = new Cache({}, { debug: true });
      const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      cache._warn('warn message');
      expect(spy).toHaveBeenCalledWith('[Cache]', 'warn message');
      spy.mockRestore();
    });
  });

  // ============================================================
  // _isExpired edge cases
  // ============================================================
  describe('_isExpired edge cases', () => {
    it('should return false for non-number non-string expires', () => {
      const cache = new Cache({});
      expect(cache._isExpired({ expires: {} })).toBe(false);
      expect(cache._isExpired({ expires: true })).toBe(false);
    });

    it('should return false for future string date', () => {
      const cache = new Cache({});
      const futureDate = new Date(Date.now() + 100000).toISOString();
      expect(cache._isExpired({ expires: futureDate })).toBe(false);
    });

    it('should return false for invalid string date', () => {
      const cache = new Cache({});
      expect(cache._isExpired({ expires: 'not-a-date' })).toBe(false);
    });
  });

  // ============================================================
  // test - error path
  // ============================================================
  describe('test error handling', () => {
    it('should return false on backend error', async () => {
      const mockBackend = { load: jest.fn().mockRejectedValue(new Error('fail')) };
      const cache = new Cache(mockBackend);
      const result = await cache.test('err_id');
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // getStats - error path
  // ============================================================
  describe('getStats error handling', () => {
    it('should return error object when getStats throws', () => {
      const mockBackend = {
        getStats: jest.fn().mockImplementation(() => { throw new Error('stats fail'); }),
        constructor: { name: 'BadBackend' }
      };
      const cache = new Cache(mockBackend);
      const stats = cache.getStats();
      expect(stats.error).toBe('stats fail');
    });
  });
});
