// library/cache/backend/memcache.js
/**
 * Memcache backend for cache system
 * Stores cache data in Memcache/Memcached servers
 *
 * NOTE:
 * - This implementation is MOCK by default (in-memory) for dev.
 * - Real memcached clients are async; to support them properly you should
 *   either (a) make the cache interface async, or (b) wrap with a promise-based API.
 */
class Memcache {
  constructor(options = {}) {
    // Handle both old 'servers' array format and new 'server' object format
    let servers;
    if (options.server) {
      servers = [{
        host: options.server.host || 'localhost',
        port: options.server.port || 11211,
        weight: options.server.weight || 1
      }];
    } else if (options.servers) {
      servers = options.servers;
    } else {
      servers = [{
        host: 'localhost',
        port: 11211,
        weight: 1
      }];
    }

    this.options = {
      servers,
      compression: options.compression !== false,
      persistent_id: options.persistent_id || null,
      key_prefix: options.key_prefix || 'app_cache_',
      lifetime: options.lifetime ?? 3600, // seconds
      debug: !!options.debug,
      use_mock: options.use_mock !== false, // default true
      ...options
    };

    this.client = null;
    this.connected = false;

    // Mock storage (Map)
    this.mockStorage = new Map();

    // Create client
    if (this.options.use_mock) {
      this.client = this.createMockClient();
      this.connected = true;
      this._log('Using MOCK Memcache backend');
    } else {
      // Placeholder for a real client
      this.client = this.createRealClient();
      this.connect();
    }
  }

  _log(...args) {
    if (this.options.debug) {
      // eslint-disable-next-line no-console
      console.debug('[Cache:Memcache]', ...args);
    }
  }

  /**
   * Create mock memcache client for development
   */
  createMockClient() {
    return {
      get: (key, callback) => {
        try {
          const entry = this.mockStorage.get(key);
          if (!entry) return callback(null, undefined);

          if (entry.expiresAt && entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
            this.mockStorage.delete(key);
            return callback(null, undefined);
          }

          return callback(null, entry.value);
        } catch (e) {
          return callback(e);
        }
      },

      set: (key, value, lifetimeSeconds, callback) => {
        try {
          const ttl = Number.isFinite(lifetimeSeconds) ? lifetimeSeconds : 0;
          const expiresAt = ttl > 0 ? Date.now() + (ttl * 1000) : 0;

          this.mockStorage.set(key, {
            value,
            expiresAt,
            createdAt: Date.now(),
            ttl
          });

          return callback(null, true);
        } catch (e) {
          return callback(e);
        }
      },

      del: (key, callback) => {
        try {
          const existed = this.mockStorage.has(key);
          this.mockStorage.delete(key);
          return callback(null, existed);
        } catch (e) {
          return callback(e);
        }
      },

      flush: (callback) => {
        try {
          this.mockStorage.clear();
          return callback(null, true);
        } catch (e) {
          return callback(e);
        }
      },

      stats: (callback) => {
        try {
          return callback(null, {
            total_items: this.mockStorage.size,
            backend: 'Mock Memcache'
          });
        } catch (e) {
          return callback(e);
        }
      }
    };
  }

  /**
   * Placeholder for real memcached client creation.
   * Real memcache clients are async; this cache backend is sync API.
   * Consider implementing an AsyncMemcache backend instead.
   */
  createRealClient() {
    // Example (async):
    // const Memcached = require('memcached');
    // return new Memcached(this.options.servers.map(s => `${s.host}:${s.port}`), { ... });
    return null;
  }

  /**
   * Connect to Memcache servers
   */
  connect() {
    try {
      if (!this.client) {
        this.connected = false;
        return;
      }
      // Real client connection check would happen here
      this.connected = true;
    } catch (_) {
      this.connected = false;
    }
  }

  /**
   * Generate memcache key with prefix
   */
  getKey(id) {
    const prefix = this.options.key_prefix || 'app_cache_';
    return prefix + String(id);
  }

  /**
   * Internal: for compatibility if you ever pass already-prefixed keys.
   */
  _getPrefixedKey(keyOrId) {
    const prefix = this.options.key_prefix || 'app_cache_';
    const k = String(keyOrId);
    return k.startsWith(prefix) ? k : (prefix + k);
  }

  /**
   * Load data from memcache (sync)
   */
  load(id) {
    if (!this.connected) return false;

    const key = this.getKey(id);

    // Mock path: synchronous read from Map
    if (this.options.use_mock) {
      const entry = this.mockStorage.get(key);
      if (!entry) return false;

      if (entry.expiresAt && entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
        this.mockStorage.delete(key);
        return false;
      }

      return entry.value;
    }

    // Real client path is not supported in sync API
    this._log('Real memcache operations are async; sync load() not supported');
    return false;
  }

  /**
   * Save data to memcache (sync)
   */
  save(data, id, tags = [], specificLifetime = null) {
    if (!this.connected) return false;

    const key = this.getKey(id);
    const ttl = Number.isFinite(specificLifetime) ? specificLifetime : (this.options.lifetime || 3600);

    if (this.options.use_mock) {
      const expiresAt = ttl > 0 ? Date.now() + (ttl * 1000) : 0;
      this.mockStorage.set(key, {
        value: data,
        expiresAt,
        createdAt: Date.now(),
        ttl
      });
      return true;
    }

    this._log('Real memcache operations are async; sync save() not supported');
    return false;
  }

  /**
   * Remove data from memcache (sync)
   */
  remove(id) {
    if (!this.connected) return false;

    const key = this.getKey(id);

    if (this.options.use_mock) {
      const existed = this.mockStorage.has(key);
      this.mockStorage.delete(key);
      return existed;
    }

    this._log('Real memcache operations are async; sync remove() not supported');
    return false;
  }

  /**
   * Clean memcache (sync)
   */
  clean(mode = 'all', tags = []) {
    if (!this.connected) return false;

    if (this.options.use_mock) {
      if (mode === 'all') {
        this.mockStorage.clear();
        return true;
      }

      // mode 'old': remove expired
      const now = Date.now();
      for (const [k, entry] of this.mockStorage.entries()) {
        if (entry.expiresAt && entry.expiresAt > 0 && now > entry.expiresAt) {
          this.mockStorage.delete(k);
        }
      }
      return true;
    }

    this._log('Real memcache operations are async; sync clean() not supported');
    return false;
  }

  /**
   * Get cache statistics (sync)
   */
  getStats() {
    if (!this.connected) {
      return {
        total_entries: 0,
        memory_usage: 0,
        hit_ratio: 0,
        backend: 'Memcache'
      };
    }

    if (this.options.use_mock) {
      // Rough memory usage
      let approxBytes = 0;
      try {
        // serialize values only (keys small)
        const values = Array.from(this.mockStorage.values()).map(v => v.value);
        approxBytes = Buffer.byteLength(JSON.stringify(values), 'utf8');
      } catch (_) {}

      return {
        total_entries: this.mockStorage.size,
        memory_usage: approxBytes,
        hit_ratio: 100,
        backend: 'Mock Memcache'
      };
    }

    return {
      total_entries: 0,
      memory_usage: 0,
      hit_ratio: 0,
      backend: 'Memcache'
    };
  }

  /**
   * Close memcache connection
   */
  close() {
    if (this.client && typeof this.client.end === 'function') {
      try { this.client.end(); } catch (_) {}
    }
    this.connected = false;
  }

  /**
   * Calculate hit ratio from memcache stats (kept for future real client use)
   */
  _calculateHitRatio(stats) {
    const hits = parseInt(stats.get_hits, 10) || 0;
    const misses = parseInt(stats.get_misses, 10) || 0;
    const total = hits + misses;
    return total > 0 ? Math.round((hits / total) * 100) : 0;
  }
}

module.exports = Memcache;