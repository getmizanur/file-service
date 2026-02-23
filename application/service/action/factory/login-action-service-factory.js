// application/service/action/factory/login-action-service-factory.js
/* eslint-disable no-undef */
const LoginActionService = require(global.applicationPath('/application/service/action/login-action-service'));

class LoginActionServiceFactory {
  createService(serviceManager) {
    const service = new LoginActionService();
    service.setServiceManager(serviceManager);
    return service;
  }
}

module.exports = LoginActionServiceFactory;
