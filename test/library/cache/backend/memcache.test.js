const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const Memcache = require(path.join(projectRoot, 'library/cache/backend/memcache'));

describe('Memcache cache backend - extended coverage', () => {

  // ---- constructor with use_mock: false (lines 55-56) ----
  describe('constructor with use_mock false', () => {
    it('should call createRealClient and connect when use_mock is false', () => {
      const mc = new Memcache({ use_mock: false });
      // createRealClient returns null, so client is null
      expect(mc.client).toBe(null);
      // connect() with null client sets connected to false
      expect(mc.connected).toBe(false);
    });
  });

  // ---- _log with debug enabled (line 63) ----
  describe('_log', () => {
    it('should call console.debug when debug is true', () => {
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      const mc = new Memcache({ debug: true });
      mc._log('test message', 'arg2');
      expect(spy).toHaveBeenCalledWith('[Cache:Memcache]', 'test message', 'arg2');
      spy.mockRestore();
    });

    it('should not call console.debug when debug is false', () => {
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      const mc = new Memcache({ debug: false });
      mc._log('test message');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  // ---- mock client get: expired entry (lines 78-79) ----
  describe('mock client get - expired entry callback', () => {
    it('should return undefined for expired entry via callback', (done) => {
      const mc = new Memcache();
      // Manually insert an expired entry into mockStorage
      mc.mockStorage.set('expired_key', {
        value: 'old_data',
        expiresAt: Date.now() - 10000,
        createdAt: Date.now() - 20000,
        ttl: 5
      });
      mc.client.get('expired_key', (err, val) => {
        expect(err).toBe(null);
        expect(val).toBeUndefined();
        // Entry should have been deleted
        expect(mc.mockStorage.has('expired_key')).toBe(false);
        done();
      });
    });
  });

  // ---- mock client get: error callback (line 84) ----
  describe('mock client get - error path', () => {
    it('should call callback with error when mockStorage.get throws', (done) => {
      const mc = new Memcache();
      // Force mockStorage.get to throw
      mc.mockStorage.get = () => { throw new Error('storage error'); };
      mc.client.get('any_key', (err, val) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('storage error');
        done();
      });
    });
  });

  // ---- mock client set: error callback (line 102) ----
  describe('mock client set - error path', () => {
    it('should call callback with error when mockStorage.set throws', (done) => {
      const mc = new Memcache();
      mc.mockStorage.set = () => { throw new Error('set error'); };
      mc.client.set('key', 'val', 60, (err, ok) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('set error');
        done();
      });
    });
  });

  // ---- mock client del: error callback (line 112) ----
  describe('mock client del - error path', () => {
    it('should call callback with error when mockStorage.has throws', (done) => {
      const mc = new Memcache();
      mc.mockStorage.has = () => { throw new Error('del error'); };
      mc.client.del('key', (err, existed) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('del error');
        done();
      });
    });
  });

  // ---- mock client flush: error callback (line 121) ----
  describe('mock client flush - error path', () => {
    it('should call callback with error when mockStorage.clear throws', (done) => {
      const mc = new Memcache();
      mc.mockStorage.clear = () => { throw new Error('flush error'); };
      mc.client.flush((err, ok) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('flush error');
        done();
      });
    });
  });

  // ---- mock client stats: error callback (line 132) ----
  describe('mock client stats - error path', () => {
    it('should call callback with error when accessing mockStorage.size throws', (done) => {
      const mc = new Memcache();
      Object.defineProperty(mc.mockStorage, 'size', {
        get() { throw new Error('stats error'); }
      });
      mc.client.stats((err, stats) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('stats error');
        done();
      });
    });
  });

  // ---- connect with real client (lines 160-163) ----
  describe('connect', () => {
    it('should set connected to true when client exists', () => {
      const mc = new Memcache();
      // Set a non-null fake client
      mc.client = { someMethod: () => {} };
      mc.connected = false;
      mc.connect();
      expect(mc.connected).toBe(true);
    });

    it('should set connected to false when client is null', () => {
      const mc = new Memcache();
      mc.client = null;
      mc.connect();
      expect(mc.connected).toBe(false);
    });
  });

  // ---- load expired entry via mock path (lines 198-199) ----
  describe('load - expired entry in mock mode', () => {
    it('should return false and delete expired entry', () => {
      const mc = new Memcache();
      mc.save({ content: 'data' }, 'expiring_key');
      // Manually expire the entry
      const key = mc.getKey('expiring_key');
      mc.mockStorage.get(key).expiresAt = Date.now() - 5000;
      const result = mc.load('expiring_key');
      expect(result).toBe(false);
      // Verify entry was deleted
      expect(mc.mockStorage.has(key)).toBe(false);
    });
  });

  // ---- load/save/remove/clean/getStats for real (non-mock) client (lines 206-207, 230-231, 248-249, 274-275, 310) ----
  describe('operations with use_mock false and connected', () => {
    let mc;

    beforeEach(() => {
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      mc = new Memcache({ use_mock: false, debug: true });
      // Force connected to true to reach the real client code paths
      mc.connected = true;
      spy.mockRestore();
    });

    it('load should return false and log message for real client', () => {
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      const result = mc.load('key1');
      expect(result).toBe(false);
      expect(spy).toHaveBeenCalledWith(
        '[Cache:Memcache]',
        'Real memcache operations are async; sync load() not supported'
      );
      spy.mockRestore();
    });

    it('save should return false and log message for real client', () => {
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      const result = mc.save({ x: 1 }, 'key1');
      expect(result).toBe(false);
      expect(spy).toHaveBeenCalledWith(
        '[Cache:Memcache]',
        'Real memcache operations are async; sync save() not supported'
      );
      spy.mockRestore();
    });

    it('remove should return false and log message for real client', () => {
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      const result = mc.remove('key1');
      expect(result).toBe(false);
      expect(spy).toHaveBeenCalledWith(
        '[Cache:Memcache]',
        'Real memcache operations are async; sync remove() not supported'
      );
      spy.mockRestore();
    });

    it('clean should return false and log message for real client', () => {
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      const result = mc.clean('all');
      expect(result).toBe(false);
      expect(spy).toHaveBeenCalledWith(
        '[Cache:Memcache]',
        'Real memcache operations are async; sync clean() not supported'
      );
      spy.mockRestore();
    });

    it('getStats should return default stats for real client', () => {
      const stats = mc.getStats();
      expect(stats).toEqual({
        total_entries: 0,
        memory_usage: 0,
        hit_ratio: 0,
        backend: 'Memcache'
      });
    });
  });

  // ---- close with client.end (line 323) ----
  describe('close with client.end', () => {
    it('should call client.end() when it exists', () => {
      const mc = new Memcache();
      const endFn = jest.fn();
      mc.client = { end: endFn };
      mc.close();
      expect(endFn).toHaveBeenCalled();
      expect(mc.connected).toBe(false);
    });

    it('should handle client.end() throwing an error gracefully', () => {
      const mc = new Memcache();
      mc.client = { end: () => { throw new Error('end error'); } };
      // Should not throw
      expect(() => mc.close()).not.toThrow();
      expect(mc.connected).toBe(false);
    });
  });
});
