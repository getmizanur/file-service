// application/service/domain/factory/file-star-domain-service-factory.js
const FileStarService = require(global.applicationPath('/application/service/domain/file-star-domain-service'));

class FileStarServiceFactory {

  createService(serviceManager) {
    const service = new FileStarService();
    service.setServiceManager(serviceManager);
    return service;
  }
}

module.exports = FileStarServiceFactory;
