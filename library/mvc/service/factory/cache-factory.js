const AbstractFactory = require('../abstract-factory');

/**
 * CacheFactory
 * Provides the default Cache service (named "Cache").
 *
 * By default, it returns CacheManager.getCache("Default") or the cache
 * defined in config.cache.
 */
class CacheFactory extends AbstractFactory {
  createService(serviceManager) {
    const config = serviceManager.get('Config') || {};
    const cacheConfig = config.cache || {};

    const cacheManager = serviceManager.get('CacheManager');

    // Optional: allow selecting a default cache name from config
    const defaultName =
      (cacheConfig && (cacheConfig.default_name || cacheConfig.defaultName)) || 'Default';

    return cacheManager.getCache(defaultName);
  }
}

module.exports = CacheFactory;
