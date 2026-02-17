const Cache = require('./cache');
const NullCache = require('./null-cache');

/**
 * CacheManager
 *
 * Creates and manages named cache instances from application configuration.
 *
 * Supported configuration shapes:
 *
 * 1) Single cache (current application.config.js):
 *   cache: {
 *     enabled: true,
 *     frontend: "Core",
 *     backend: "File",
 *     frontend_options: {...},
 *     backend_options: {...}
 *   }
 *
 * 2) Multiple named caches (optional extension):
 *   cache: {
 *     enabled: true,
 *     caches: {
 *       Default: { frontend, backend, frontend_options, backend_options },
 *       Metadata: { ... }
 *     }
 *   }
 *
 * Usage via ServiceManager:
 *   const cache = this.getServiceManager().get('Cache'); // default
 *   const cacheManager = this.getServiceManager().get('CacheManager');
 *   const metaCache = cacheManager.getCache('Metadata');
 */
class CacheManager {
  constructor(cacheConfig = {}) {
    this.config = cacheConfig || {};
    this.instances = {};
  }

  /**
   * Get a named cache instance.
   * @param {string} name
   * @returns {Cache|NullCache}
   */
  getCache(name = 'Default') {
    if (this.instances[name]) return this.instances[name];

    const cfg = this._resolveConfig(name);

    // If cache disabled globally or for this cache
    if (!cfg.enabled) {
      const inst = new NullCache();
      this.instances[name] = inst;
      return inst;
    }

    const frontend = cfg.frontend || 'Core';
    const backend = cfg.backend || 'File';
    const frontendOptions = cfg.frontend_options || {};
    const backendOptions = cfg.backend_options || {};

    const inst = Cache.factory(frontend, backend, frontendOptions, backendOptions);
    this.instances[name] = inst;
    return inst;
  }

  /**
   * Resolve configuration for a named cache with sane defaults.
   * @private
   */
  _resolveConfig(name) {
    const globalEnabled = this.config.enabled !== false;

    // Named caches extension
    if (this.config.caches && typeof this.config.caches === 'object') {
      const named = this.config.caches[name] || this.config.caches.Default || {};
      return {
        enabled: globalEnabled && (named.enabled !== false),
        frontend: named.frontend || this.config.frontend,
        backend: named.backend || this.config.backend,
        frontend_options: { ...(this.config.frontend_options || {}), ...(named.frontend_options || {}) },
        backend_options: { ...(this.config.backend_options || {}), ...(named.backend_options || {}) },
      };
    }

    // Single cache config
    return {
      enabled: globalEnabled,
      frontend: this.config.frontend,
      backend: this.config.backend,
      frontend_options: this.config.frontend_options || {},
      backend_options: this.config.backend_options || {},
    };
  }
}

module.exports = CacheManager;
