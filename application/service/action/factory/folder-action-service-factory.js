// application/service/action/factory/folder-action-service-factory.js
/* eslint-disable no-undef */
const FolderActionService = require(global.applicationPath('/application/service/action/folder-action-service'));

class FolderActionServiceFactory {
  createService(serviceManager) {
    const service = new FolderActionService();
    service.setServiceManager(serviceManager);
    return service;
  }
}

module.exports = FolderActionServiceFactory;
