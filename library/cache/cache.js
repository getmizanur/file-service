// library/cache/cache.js
const path = require('path');

/**
 * Advanced Cache class with multiple storage backends
 *
 * Usage:
 * const cache = Cache.factory('Core', 'File', coreOptions, backendOptions);
 * cache.save(data, 'cache_id', lifetimeSeconds);
 * const data = cache.load('cache_id');
 */
class Cache {
  constructor(backend, options = {}) {
    this.backend = backend;

    this.options = {
      lifetime: 7200, // seconds
      automatic_serialization: true,
      debug: false,
      ...options
    };
  }

  _log(...args) {
    if (this.options.debug) {
      // eslint-disable-next-line no-console
      console.debug('[Cache]', ...args);
    }
  }

  _warn(...args) {
    if (this.options.debug) {
      // eslint-disable-next-line no-console
      console.warn('[Cache]', ...args);
    }
  }

  /**
   * Factory method for creating cache instances
   * @param {string} frontend - Frontend type (always 'Core' for now)
   * @param {string} backend - Backend type: 'File', 'Memcache', 'Sqlite'
   * @param {object} frontendOptions - Frontend options (lifetime, serialization, debug)
   * @param {object} backendOptions - Backend-specific options
   * @returns {Cache}
   */
  static factory(frontend, backend, frontendOptions = {}, backendOptions = {}) {
    if (!backend || typeof backend !== 'string') {
      throw new Error('Cache backend name is required');
    }

    const backendName = backend.trim();
    const moduleName = backendName.toLowerCase();

    let backendAdapter;
    try {
      // backend classes live in ./backend/<name>.js
      const BackendClass = require(path.join(__dirname, 'backend', moduleName));
      backendAdapter = new BackendClass(backendOptions);
    } catch (error) {
      throw new Error(`Cache backend '${backendName}' not found or failed to load: ${error.message}`);
    }

    return new Cache(backendAdapter, frontendOptions);
  }

  /**
   * Normalize backend load output.
   * Expected legacy shape: { content, created, expires }
   * But newer backends may return an object with those fields + extras.
   */
  _normalizeRecord(record) {
    if (!record || typeof record !== 'object') return null;

    // Some backends may store directly as { value: ... } etc; we standardize on "content".
    if (!Object.prototype.hasOwnProperty.call(record, 'content')) {
      // If record is already a payload-like object, treat as content
      return {
        content: record,
        created: record.created || record.created_dt || Date.now(),
        expires: record.expires || record.expires_at || 0
      };
    }

    return {
      content: record.content,
      created: record.created || record.created_dt || Date.now(),
      expires: record.expires || record.expires_at || 0,
      ...record
    };
  }

  _isExpired(record) {
    if (!record) return false;
    const raw = record.expires || record.expires_at || 0;

    if (!raw) return false;

    if (typeof raw === 'number') {
      return raw > 0 && Date.now() > raw;
    }

    if (typeof raw === 'string') {
      const parsed = Date.parse(raw);
      return !Number.isNaN(parsed) && Date.now() > parsed;
    }

    return false;
  }

  /**
   * Load data from cache
   * @param {string} id - Cache identifier
   * @returns {*} - Cached data or false if not found/expired
   */
  load(id) {
    try {
      const raw = this.backend.load(id);
      if (raw === false) return false;

      const record = this._normalizeRecord(raw);
      if (!record) return false;

      // Safety net: expiration check (backend may have done it already)
      if (this._isExpired(record)) {
        try { this.backend.remove(id); } catch (_) {}
        return false;
      }

      const content = record.content;

      // Auto-deserialize if enabled
      if (this.options.automatic_serialization && typeof content === 'string') {
        try {
          return JSON.parse(content);
        } catch (_) {
          return content;
        }
      }

      return content;
    } catch (error) {
      this._warn('Cache load error:', error.message);
      return false;
    }
  }

  /**
   * Save data to cache
   * @param {*} data - Data to cache
   * @param {string} id - Cache identifier
   * @param {number|null} specificLifetime - Lifetime in seconds (optional)
   * @returns {boolean} - Success status
   */
  save(data, id, specificLifetime = null) {
    try {
      const lifetime = (specificLifetime !== null && specificLifetime !== undefined)
        ? specificLifetime
        : this.options.lifetime;

      const ttl = Number(lifetime) || 0;
      const expires = ttl > 0 ? Date.now() + (ttl * 1000) : 0;

      // Auto-serialize if enabled
      let content = data;
      if (this.options.automatic_serialization && typeof data !== 'string') {
        content = JSON.stringify(data);
      }

      const cacheData = {
        content,
        created: Date.now(),
        expires
      };

      return this.backend.save(cacheData, id, [], ttl);
      // NOTE: pass ttl along as "specificLifetime" to backends that support it
    } catch (error) {
      this._warn('Cache save error:', error.message);
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
      this._warn('Cache remove error:', error.message);
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
      this._warn('Cache clean error:', error.message);
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
      const raw = this.backend.load(id);
      if (raw === false) return false;

      const record = this._normalizeRecord(raw);
      if (!record) return false;

      if (this._isExpired(record)) {
        try { this.backend.remove(id); } catch (_) {}
        return false;
      }

      return record.created || true;
    } catch (error) {
      this._warn('Cache test error:', error.message);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache statistics
   */
  getStats() {
    try {
      if (typeof this.backend.getStats === 'function') {
        return this.backend.getStats();
      }

      return {
        backend: this.backend.constructor.name,
        message: 'Statistics not available for this backend'
      };
    } catch (error) {
      this._warn('Cache stats error:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Get backend type
   * @returns {string}
   */
  getBackend() {
    return this.backend.constructor.name;
  }
}

module.exports = Cache;