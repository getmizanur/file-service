const fs = require('fs');
const path = require('path');

/**
 * Advanced Cache class with multiple storage backends
 * 
 * Usage:
 * const cache = Cache.factory('Core', 'File', coreOptions, backendOptions);
 * cache.save(data, 'cache_id', lifetime);
 * const data = cache.load('cache_id');
 */
class Cache {
  constructor(backend, options = {}) {
    this.backend = backend;
    this.options = {
      lifetime: 7200, // 2 hours default
      automatic_serialization: true,
      ...options
    };
  }

  /**
   * Factory method for creating cache instances
   * @param {string} frontend - Frontend type (always 'Core' for now)
   * @param {string} backend - Backend type: 'File', 'Memcache', 'Sqlite'
   * @param {object} frontendOptions - Frontend options (lifetime, serialization)
   * @param {object} backendOptions - Backend-specific options
   * @returns {Cache}
   */
  static factory(frontend, backend, frontendOptions = {}, backendOptions = {}) {
    // Load backend adapter
    let backendAdapter;

    try {
      const BackendClass = require(`./backend/${backend.toLowerCase()}`);
      backendAdapter = new BackendClass(backendOptions);
    } catch (error) {
      throw new Error(`Cache backend '${backend}' not found: ${error.message}`);
    }

    return new Cache(backendAdapter, frontendOptions);
  }

  /**
   * Load data from cache
   * @param {string} id - Cache identifier
   * @returns {*} - Cached data or false if not found/expired
   */
  load(id) {
    try {
      const data = this.backend.load(id);

      if(data === false) {
        return false;
      }

      // Check expiration
      if(data.expires && Date.now() > data.expires) {
        this.backend.remove(id);
        return false;
      }

      // Auto-deserialize if enabled
      if(this.options.automatic_serialization && typeof data.content === 'string') {
        try {
          return JSON.parse(data.content);
        } catch (e) {
          return data.content;
        }
      }

      return data.content;
    } catch (error) {
      console.error('Cache load error:', error);
      return false;
    }
  }

  /**
   * Save data to cache
   * @param {*} data - Data to cache
   * @param {string} id - Cache identifier
   * @param {number} specificLifetime - Lifetime in seconds (optional)
   * @returns {boolean} - Success status
   */
  save(data, id, specificLifetime = null) {
    try {
      const lifetime = specificLifetime || this.options.lifetime;
      const expires = lifetime > 0 ? Date.now() + (lifetime * 1000) : 0;

      // Auto-serialize if enabled
      let content = data;
      if(this.options.automatic_serialization && typeof data !== 'string') {
        content = JSON.stringify(data);
      }

      const cacheData = {
        content: content,
        created: Date.now(),
        expires: expires
      };

      return this.backend.save(cacheData, id);
    } catch (error) {
      console.error('Cache save error:', error);
      return false;
    }
  }

  /**
   * Remove specific cache entry
   * @param {string} id - Cache identifier
   * @returns {boolean} - Success status
   */
  remove(id) {
    try {
      return this.backend.remove(id);
    } catch (error) {
      console.error('Cache remove error:', error);
      return false;
    }
  }

  /**
   * Clean cache
   * @param {string} mode - Cleaning mode: 'all', 'old', 'matchingTag', 'notMatchingTag'
   * @param {array} tags - Tags for tag-based cleaning (optional)
   * @returns {boolean} - Success status
   */
  clean(mode = 'all', tags = []) {
    try {
      return this.backend.clean(mode, tags);
    } catch (error) {
      console.error('Cache clean error:', error);
      return false;
    }
  }

  /**
   * Test if cache entry exists
   * @param {string} id - Cache identifier
   * @returns {boolean|number} - False if not exists, timestamp if exists
   */
  test(id) {
    try {
      const data = this.backend.load(id);

      if(data === false) {
        return false;
      }

      // Check expiration
      if(data.expires && Date.now() > data.expires) {
        this.backend.remove(id);
        return false;
      }

      return data.created || true;
    } catch (error) {
      console.error('Cache test error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache statistics
   */
  getStats() {
    try {
      if(typeof this.backend.getStats === 'function') {
        return this.backend.getStats();
      }

      return {
        backend: this.backend.constructor.name,
        message: 'Statistics not available for this backend'
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        error: error.message
      };
    }
  }

  /**
   * Get backend type
   * @returns {string} - Backend class name
   */
  getBackend() {
    return this.backend.constructor.name;
  }
}

module.exports = Cache;