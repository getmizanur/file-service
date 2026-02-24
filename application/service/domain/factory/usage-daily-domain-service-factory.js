// application/service/domain/factory/usage-daily-domain-service-factory.js
const UsageDailyService = require(global.applicationPath('/application/service/domain/usage-daily-domain-service'));

class UsageDailyServiceFactory {
  createService(serviceManager) {
    const service = new UsageDailyService();
    service.setServiceManager(serviceManager);
    return service;
  }
}

module.exports = UsageDailyServiceFactory;
