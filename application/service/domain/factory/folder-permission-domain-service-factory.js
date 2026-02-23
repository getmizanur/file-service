// application/service/domain/factory/folder-permission-domain-service-factory.js
const FolderPermissionService = require(global.applicationPath('/application/service/domain/folder-permission-domain-service'));

class FolderPermissionServiceFactory {
  createService(serviceManager) {
    const service = new FolderPermissionService();
    service.setServiceManager(serviceManager);
    return service;
  }
}

module.exports = FolderPermissionServiceFactory;
