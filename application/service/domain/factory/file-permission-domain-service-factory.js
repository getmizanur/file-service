// application/service/domain/factory/file-permission-domain-service-factory.js
const FilePermissionService = require(global.applicationPath('/application/service/domain/file-permission-domain-service'));

class FilePermissionServiceFactory {
  createService(serviceManager) {
    const service = new FilePermissionService();
    service.setServiceManager(serviceManager);
    return service;
  }
}

module.exports = FilePermissionServiceFactory;
