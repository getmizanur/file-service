// application/service/domain/factory/folder-share-link-domain-service-factory.js
const FolderShareLinkService = require(global.applicationPath('/application/service/domain/folder-share-link-domain-service'));

class FolderShareLinkServiceFactory {
  createService(serviceManager) {
    const service = new FolderShareLinkService();
    service.setServiceManager(serviceManager);
    return service;
  }
}

module.exports = FolderShareLinkServiceFactory;
