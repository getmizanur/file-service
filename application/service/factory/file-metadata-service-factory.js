const FileMetadataService = require(global.applicationPath('/application/service/file-metadata-service'));

class FileMetadataServiceFactory {

  createService(serviceManager) {
    const service = new FileMetadataService();
    service.setServiceManager(serviceManager);
    return service;
  }
}

module.exports = FileMetadataServiceFactory;
