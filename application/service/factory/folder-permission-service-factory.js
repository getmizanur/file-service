const FolderPermissionService = require(global.applicationPath('/application/service/folder-permission-service'));

class FolderPermissionServiceFactory {
  createService(serviceManager) {
    const service = new FolderPermissionService();
    service.setServiceManager(serviceManager);
    return service;
  }
}

module.exports = FolderPermissionServiceFactory;
