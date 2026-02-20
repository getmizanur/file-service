const FileMetadataService = require(global.applicationPath('/application/service/domain/file-metadata-domain-service'));

class FileMetadataServiceFactory {

  createService(serviceManager) {
    const service = new FileMetadataService();
    service.setServiceManager(serviceManager);
    return service;
  }
}

module.exports = FileMetadataServiceFactory;
