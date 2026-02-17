const AbstractFactory = require('../abstract-factory');
const CacheManager = require('../../../cache/cache-manager');

/**
 * CacheManagerFactory
 * Provides the CacheManager service.
 */
class CacheManagerFactory extends AbstractFactory {
  createService(serviceManager) {
    const config = serviceManager.get('Config') || {};
    const cacheConfig = config.cache || {};
    return new CacheManager(cacheConfig);
  }
}

module.exports = CacheManagerFactory;
