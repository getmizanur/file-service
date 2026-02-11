/**
 * Memcache backend for cache system
 * Stores cache data in Memcache/Memcached servers
 * 
 * Note: This is a mock implementation since memcache isn't installed
 * In production, you would use 'memcached' or 'node-memcached' packages
 */
class Memcache {
  constructor(options = {}) {
    // Handle both old 'servers' array format and new 'server' object format
    let servers;
    if(options.server) {
      // New single server object format
      servers = [{
        host: options.server.host || 'localhost',
        port: options.server.port || 11211,
        weight: options.server.weight || 1
      }];
    } else if(options.servers) {
      // Old servers array format
      servers = options.servers;
    } else {
      // Default fallback
      servers = [{
        host: 'localhost',
        port: 11211,
        weight: 1
      }];
    }

    this.options = {
      servers: servers,
      compression: options.compression !== false, // Default true
      persistent_id: options.persistent_id || null,
      key_prefix: options.key_prefix || '',
      ...options
    };

    // Mock memcache client (in production, use real memcache client)
    this.client = this.createMockClient();
    this.connected = false;

    // Try to connect
    this.connect();
  }

  /**
   * Create mock memcache client for development
   * In production, replace with real memcache client:
   * const Memcached = require('memcached');
   * return new Memcached(servers, options);
   */
  createMockClient() {
    console.warn('Using MOCK Memcache client - install memcached package for production');

    // In-memory mock storage
    this.mockStorage = new Map();

    return {
      get: (key, callback) => {
        const data = this.mockStorage.get(key);
        if(data && data.expires && Date.now() > data.expires) {
          this.mockStorage.delete(key);
          callback(null, undefined);
        } else {
          callback(null, data ? data.value : undefined);
        }
      },
      set: (key, value, lifetime, callback) => {
        const expires = lifetime > 0 ? Date.now() + (lifetime * 1000) : 0;
        this.mockStorage.set(key, {
          value,
          expires,
          created: Date.now()
        });
        callback(null, true);
      },
      del: (key, callback) => {
        const existed = this.mockStorage.has(key);
        this.mockStorage.delete(key);
        callback(null, existed);
      },
      flush: (callback) => {
        this.mockStorage.clear();
        callback(null, true);
      },
      stats: (callback) => {
        callback(null, {
          total_items: this.mockStorage.size,
          backend: 'Mock Memcache'
        });
      }
    };
  }

  /**
   * Connect to Memcache servers
   */
  connect() {
    try {
      // In production, implement real connection logic
      this.connected = true;
      console.log('Mock Memcache connected (use real memcached package in production)');
    } catch (error) {
      console.error('Memcache connection failed:', error);
      this.connected = false;
    }
  }

  /**
   * Generate memcache key with prefix
   * @param {string} id - Cache identifier
   * @returns {string} - Prefixed key
   */
  getKey(id) {
    const prefix = this.options.key_prefix || 'app_cache_';
    return prefix + id;
  }

  /**
   * Load data from memcache (synchronous interface)
   * @param {string} id - Cache identifier
   * @returns {object|false} - Cache data or false if not found
   */
  load(id) {
    if(!this.connected) {
      return false;
    }

    const key = this.getKey(id);

    // For mock implementation, use direct synchronous access
    if(this.mockStorage) {
      return this._loadSync(key);
    }

    // For real memcache, would need to handle async differently
    return this._loadFromRealMemcache(key);
  }

  /**
   * Save data to memcache (synchronous interface)
   * @param {*} data - Data to cache
   * @param {string} id - Cache identifier
   * @param {array} tags - Tags (not supported in memcache)
   * @param {number} specificLifetime - Cache lifetime in seconds
   * @returns {boolean} - Success status
   */
  save(data, id, tags = [], specificLifetime = null) {
    if(!this.connected) {
      return false;
    }

    const key = this.getKey(id);
    const ttl = specificLifetime || this.options.lifetime || 3600;

    if(this.mockStorage) {
      return this._saveSync(key, data, ttl);
    }

    return this._saveToRealMemcache(key, data, ttl);
  }
  /**
   * Remove data from memcache (synchronous interface)
   * @param {string} id - Cache identifier
   * @returns {boolean} - Success status
   */
  remove(id) {
    if(!this.connected) {
      return false;
    }

    const key = this.getKey(id);

    if(this.mockStorage) {
      return this._removeSync(key);
    }

    return this._removeFromRealMemcache(key);
  }

  /**
   * Clean memcache (synchronous interface)
   * @param {string} mode - Cleaning mode: 'all', 'old'
   * @param {array} tags - Tags (not supported in memcache)
   * @returns {boolean} - Success status
   */
  clean(mode = 'all', tags = []) {
    if(!this.connected) {
      return false;
    }

    if(this.mockStorage) {
      return this._cleanSync(mode);
    }

    return this._cleanRealMemcache(mode);
  }

  /**
   * Get cache statistics (synchronous interface)
   * @returns {object} - Cache statistics
   */
  getStats() {
    if(!this.connected) {
      return {
        total_entries: 0,
        memory_usage: 0,
        hit_ratio: 0
      };
    }

    if(this.mockStorage) {
      return this._getStatsSync();
    }

    return this._getStatsFromRealMemcache();
  }

  /**
   * Close memcache connection
   */
  close() {
    if(this.client && typeof this.client.end === 'function') {
      this.client.end();
    }
    this.connected = false;
  }

  // Private helper methods for mock storage operations
  /**
   * Load value from mock storage
   * @param {string} key - Cache key
   * @returns {*} - Cached value or null if not found/expired
   */
  _loadSync(key) {
    const prefixedKey = this._getPrefixedKey(key);
    const entry = this.mockStorage[prefixedKey];

    if(!entry) {
      return null;
    }

    // Check if expired
    if(entry.ttl > 0 && Date.now() > entry.created + (entry.ttl * 1000)) {
      delete this.mockStorage[prefixedKey];
      return null;
    }

    return entry.data;
  }

  /**
   * Save value to mock storage
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {boolean} - Success status
   */
  _saveSync(key, data, ttl) {
    try {
      const prefixedKey = this._getPrefixedKey(key);
      this.mockStorage[prefixedKey] = {
        data: data,
        ttl: ttl,
        created: Date.now()
      };
      return true;
    } catch (error) {
      console.error('Mock cache save error:', error);
      return false;
    }
  }

  /**
   * Remove value from mock storage
   * @param {string} key - Cache key
   * @returns {boolean} - Success status
   */
  _removeSync(key) {
    const prefixedKey = this._getPrefixedKey(key);
    const existed = this.mockStorage.hasOwnProperty(prefixedKey);
    delete this.mockStorage[prefixedKey];
    return existed;
  }

  /**
   * Clean mock storage
   * @param {string} mode - Cleaning mode
   * @returns {boolean} - Success status
   */
  _cleanSync(mode) {
    if(mode === 'all') {
      // Clear all entries
      this.mockStorage = {};
      return true;
    } else {
      // Remove expired entries
      const now = Date.now();
      let cleaned = false;

      for(const [key, entry] of Object.entries(this.mockStorage)) {
        if(entry.ttl > 0 && now > entry.created + (entry.ttl * 1000)) {
          delete this.mockStorage[key];
          cleaned = true;
        }
      }

      return true; // Always return true for expired cleanup
    }
  }

  /**
   * Get stats from mock storage
   * @returns {object} - Cache statistics
   */
  _getStatsSync() {
    const entries = Object.keys(this.mockStorage).length;
    const memoryUsage = JSON.stringify(this.mockStorage).length;

    return {
      total_entries: entries,
      memory_usage: memoryUsage,
      hit_ratio: 100 // Mock storage always "hits" for existing keys
    };
  }

  // Private helper methods for real memcache operations
  /**
   * Load value from real memcache (synchronous wrapper)
   * @param {string} key - Cache key
   * @returns {*} - Cached value or null if not found
   */
  _loadFromRealMemcache(key) {
    // Note: In a real implementation, this would need to be truly synchronous
    // or the entire cache interface would need to be made async
    console.warn('Real memcache operations are async but being called synchronously');
    return null;
  }

  /**
   * Save value to real memcache (synchronous wrapper)
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {boolean} - Success status
   */
  _saveToRealMemcache(key, data, ttl) {
    // Note: In a real implementation, this would need to be truly synchronous
    console.warn('Real memcache operations are async but being called synchronously');
    return false;
  }

  /**
   * Remove value from real memcache (synchronous wrapper)
   * @param {string} key - Cache key
   * @returns {boolean} - Success status
   */
  _removeFromRealMemcache(key) {
    // Note: In a real implementation, this would need to be truly synchronous
    console.warn('Real memcache operations are async but being called synchronously');
    return false;
  }

  /**
   * Clean real memcache (synchronous wrapper)
   * @param {string} mode - Cleaning mode
   * @returns {boolean} - Success status
   */
  _cleanRealMemcache(mode) {
    // Note: In a real implementation, this would need to be truly synchronous
    console.warn('Real memcache operations are async but being called synchronously');
    return false;
  }

  /**
   * Get stats from real memcache (synchronous wrapper)
   * @returns {object} - Cache statistics
   */
  _getStatsFromRealMemcache() {
    // Note: In a real implementation, this would need to be truly synchronous
    console.warn('Real memcache operations are async but being called synchronously');
    return {
      total_entries: 0,
      memory_usage: 0,
      hit_ratio: 0
    };
  }

  /**
   * Calculate hit ratio from memcache stats
   * @param {object} stats - Memcache stats object
   * @returns {number} - Hit ratio as percentage
   */
  _calculateHitRatio(stats) {
    const hits = parseInt(stats.get_hits) || 0;
    const misses = parseInt(stats.get_misses) || 0;
    const total = hits + misses;

    return total > 0 ? Math.round((hits / total) * 100) : 0;
  }
}

module.exports = Memcache;