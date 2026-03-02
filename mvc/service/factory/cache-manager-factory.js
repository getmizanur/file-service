// library/mvc/service/factory/cache-manager-factory.js
const AbstractFactory = require('../abstract-factory');
const CacheManager = require('../../../cache/cache-manager');

/**
 * CacheManagerFactory
 * Provides the CacheManager service.
 */
class CacheManagerFactory extends AbstractFactory {
  createService(serviceManager) {
    if (!serviceManager || typeof serviceManager.get !== 'function') {
      throw new Error('CacheManagerFactory: serviceManager is required');
    }

    let config = {};
    try {
      config = serviceManager.get('Config') || {};
    } catch (e) {
      // Config might not be registered in minimal apps; allow CacheManager to default
      config = {};
    }

    const cacheConfig = (config.cache && typeof config.cache === 'object')
      ? config.cache
      : {};

    // Pass serviceManager as optional second arg for future extensibility.
    return new CacheManager(cacheConfig, serviceManager);
  }
}

module.exports = CacheManagerFactory;