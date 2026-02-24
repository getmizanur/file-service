// application/service/domain/factory/file-share-link-domain-service-factory.js
const FileShareLinkService = require(global.applicationPath('/application/service/domain/file-share-link-domain-service'));

class FileShareLinkServiceFactory {
  createService(serviceManager) {
    const service = new FileShareLinkService();
    service.setServiceManager(serviceManager);
    return service;
  }
}

module.exports = FileShareLinkServiceFactory;
