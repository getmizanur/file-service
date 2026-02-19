const StorageService = require(global.applicationPath('/application/service/storage-service'));

class StorageServiceFactory {

  createService(serviceManager) {
    const service = new StorageService();
    service.setServiceManager(serviceManager);
    return service;
  }
}

module.exports = StorageServiceFactory;
