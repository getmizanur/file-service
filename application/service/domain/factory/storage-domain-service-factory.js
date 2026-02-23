// application/service/domain/factory/storage-domain-service-factory.js
const StorageService = require(global.applicationPath('/application/service/domain/storage-domain-service'));

class StorageServiceFactory {

  createService(serviceManager) {
    const service = new StorageService();
    service.setServiceManager(serviceManager);
    return service;
  }
}

module.exports = StorageServiceFactory;
