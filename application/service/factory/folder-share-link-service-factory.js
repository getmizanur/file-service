const FolderShareLinkService = require(global.applicationPath('/application/service/folder-share-link-service'));

class FolderShareLinkServiceFactory {
  createService(serviceManager) {
    const service = new FolderShareLinkService();
    service.setServiceManager(serviceManager);
    return service;
  }
}

module.exports = FolderShareLinkServiceFactory;
