// application/service/domain/factory/derivative-domain-service-factory.js
const DerivativeService = require(globalThis.applicationPath('/application/service/domain/derivative-domain-service'));

class DerivativeServiceFactory {

  createService(serviceManager) {
    const service = new DerivativeService();
    service.setServiceManager(serviceManager);
    return service;
  }
}

module.exports = DerivativeServiceFactory;
