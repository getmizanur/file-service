const Cache = require('./cache');
const NullCache = require('./null-cache');

/**
 * CacheManager
 *
 * Creates and manages named cache instances from application configuration.
 *
 * Supported configuration shapes:
 *
 * 1) Single cache:
 *   cache: {
 *     enabled: true,
 *     frontend: "Core",
 *     backend: "File",
 *     frontend_options: {...},
 *     backend_options: {...}
 *   }
 *
 * 2) Multiple named caches:
 *   cache: {
 *     enabled: true,
 *     caches: {
 *       Default: { frontend, backend, frontend_options, backend_options },
 *       Metadata: { ... }
 *     }
 *   }
 */
class CacheManager {
  constructor(cacheConfig = {}, serviceManager = null) {
    this.config = cacheConfig || {};
    this.instances = {};
    this.serviceManager = serviceManager || null;
  }

  setServiceManager(serviceManager) {
    this.serviceManager = serviceManager || null;
    return this;
  }

  getServiceManager() {
    return this.serviceManager;
  }

  /**
   * Returns true if configuration exists for the named cache.
   * Note: if using single-cache config (no caches map), returns true for any name.
   */
  hasCache(name = 'Default') {
    const n = name || 'Default';

    if (this.config && this.config.caches && typeof this.config.caches === 'object') {
      return (
        Object.prototype.hasOwnProperty.call(this.config.caches, n) ||
        Object.prototype.hasOwnProperty.call(this.config.caches, 'Default')
      );
    }

    // single-cache config => treat as available
    return true;
  }

  /**
   * Get a named cache instance.
   * @param {string} name
   * @returns {Cache|NullCache}
   */
  getCache(name = 'Default') {
    const n = name || 'Default';

    if (Object.prototype.hasOwnProperty.call(this.instances, n)) {
      return this.instances[n];
    }

    const cfg = this._resolveConfig(n);

    // If cache disabled globally or for this cache
    if (!cfg.enabled) {
      const inst = new NullCache();
      this.instances[n] = inst;
      return inst;
    }

    const frontend = cfg.frontend || 'Core';
    const backend = cfg.backend || 'File';
    const frontendOptions = cfg.frontend_options || {};
    const backendOptions = cfg.backend_options || {};

    const inst = Cache.factory(frontend, backend, frontendOptions, backendOptions);
    this.instances[n] = inst;
    return inst;
  }

  /**
   * Remove one cached instance (next getCache will re-create).
   */
  clearCache(name = 'Default') {
    const n = name || 'Default';
    delete this.instances[n];
    return this;
  }

  /**
   * Clear all cached instances.
   */
  clearAll() {
    this.instances = {};
    return this;
  }

  /**
   * Resolve configuration for a named cache with sane defaults.
   * @private
   */
  _resolveConfig(name) {
    const n = name || 'Default';
    const globalEnabled = this.config.enabled !== false;

    // Named caches extension
    if (this.config.caches && typeof this.config.caches === 'object' && !Array.isArray(this.config.caches)) {
      const namedRaw =
        (Object.prototype.hasOwnProperty.call(this.config.caches, n) && this.config.caches[n]) ||
        (Object.prototype.hasOwnProperty.call(this.config.caches, 'Default') && this.config.caches.Default) ||
        {};

      const named = (namedRaw && typeof namedRaw === 'object' && !Array.isArray(namedRaw)) ? namedRaw : {};

      return {
        enabled: globalEnabled && (named.enabled !== false),
        frontend: named.frontend || this.config.frontend,
        backend: named.backend || this.config.backend,
        frontend_options: { ...(this.config.frontend_options || {}), ...(named.frontend_options || {}) },
        backend_options: { ...(this.config.backend_options || {}), ...(named.backend_options || {}) }
      };
    }

    // Single cache config
    return {
      enabled: globalEnabled,
      frontend: this.config.frontend,
      backend: this.config.backend,
      frontend_options: this.config.frontend_options || {},
      backend_options: this.config.backend_options || {}
    };
  }
}

module.exports = CacheManager;