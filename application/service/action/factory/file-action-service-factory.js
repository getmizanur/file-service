// application/service/action/factory/file-action-service-factory.js
/* eslint-disable no-undef */
const FileActionService = require(global.applicationPath('/application/service/action/file-action-service'));

class FileActionServiceFactory {
  createService(serviceManager) {
    const service = new FileActionService();
    service.setServiceManager(serviceManager);
    return service;
  }
}

module.exports = FileActionServiceFactory;
