const AbstractFactory = require('../abstract-factory');

/**
 * CacheFactory
 * Provides the default Cache service (named "Cache").
 *
 * Returns CacheManager.getCache(<defaultName>).
 * defaultName comes from config.cache.default_name (or defaultName), else "Default".
 */
class CacheFactory extends AbstractFactory {
  createService(serviceManager) {
    if (!serviceManager || typeof serviceManager.get !== 'function') {
      throw new Error('CacheFactory: serviceManager is required');
    }

    let config = {};
    try {
      config = serviceManager.get('Config') || {};
    } catch (e) {
      // Config might not be registered; that's okay for cache fallback
      config = {};
    }

    const cacheConfig = (config && config.cache && typeof config.cache === 'object')
      ? config.cache
      : {};

    let cacheManager;
    try {
      cacheManager = serviceManager.get('CacheManager');
    } catch (e) {
      throw new Error("CacheFactory: 'CacheManager' service is not registered");
    }

    if (!cacheManager || typeof cacheManager.getCache !== 'function') {
      throw new Error("CacheFactory: 'CacheManager' is invalid (missing getCache())");
    }

    const defaultName = cacheConfig.default_name || cacheConfig.defaultName || 'Default';

    // CacheManager should decide what to do if the cache isn't configured (e.g., return NullCache)
    return cacheManager.getCache(defaultName);
  }
}

module.exports = CacheFactory;