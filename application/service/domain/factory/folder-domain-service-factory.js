const FolderService = require(global.applicationPath('/application/service/domain/folder-domain-service'));

class FolderServiceFactory {

  createService(serviceManager) {
    const service = new FolderService();
    service.setServiceManager(serviceManager);
    return service;
  }
}

module.exports = FolderServiceFactory;
