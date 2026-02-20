const UserService = require(global.applicationPath('/application/service/domain/user-domain-service'));

class UserServiceFactory {

  createService(serviceManager) {
    const service = new UserService();
    service.setServiceManager(serviceManager);
    return service;
  }
}

module.exports = UserServiceFactory;
