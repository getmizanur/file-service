// application/service/domain/factory/query-cache-domain-service-factory.js
const QueryCacheService = require(global.applicationPath('/application/service/domain/query-cache-domain-service'));

class QueryCacheServiceFactory {

  createService(serviceManager) {
    const service = new QueryCacheService();
    service.setServiceManager(serviceManager);
    return service;
  }
}

module.exports = QueryCacheServiceFactory;
