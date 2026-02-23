// application/service/action/factory/index-action-service-factory.js
/* eslint-disable no-undef */
const IndexActionService = require(global.applicationPath('/application/service/action/index-action-service'));

class IndexActionServiceFactory {
  createService(serviceManager) {
    const service = new IndexActionService();
    service.setServiceManager(serviceManager);
    return service;
  }
}

module.exports = IndexActionServiceFactory;
