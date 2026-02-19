const UserService = require(global.applicationPath('/application/service/user-service'));

class UserServiceFactory {

  createService(serviceManager) {
    const service = new UserService();
    service.setServiceManager(serviceManager);
    return service;
  }
}

module.exports = UserServiceFactory;
