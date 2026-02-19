// application/service/factory/folder-star-service-factory.js
// Factory for creating FolderStarService with ServiceManager injected
const FolderStarService = require(global.applicationPath('/application/service/folder-star-service'));

/**
 * FolderStarServiceFactory
 * Creates FolderStarService instance with ServiceManager injected
 */
class FolderStarServiceFactory {

  createService(serviceManager) {
    const service = new FolderStarService();
    service.setServiceManager(serviceManager);
    return service;
  }
}

module.exports = FolderStarServiceFactory;
