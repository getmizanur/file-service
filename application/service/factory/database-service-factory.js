// application/service/factory/database-service-factory.js
// Factory for creating DatabaseService with ServiceManager injected

const AbstractFactory = require(global.applicationPath('/library/mvc/service/abstract-factory'));
const DatabaseService = require(global.applicationPath('/application/service/database-service'));

/**
 * DatabaseServiceFactory
 * Creates DatabaseService instance with ServiceManager injected
 */
class DatabaseServiceFactory extends AbstractFactory {
  /**
   * Create DatabaseService instance
   * @param {ServiceManager} serviceManager - Service manager instance
   * @returns {DatabaseService} DatabaseService instance
   */
  createService(serviceManager) {
    try {
      // Create DatabaseService instance
      const databaseService = new DatabaseService();

      // Inject ServiceManager into the service
      databaseService.setServiceManager(serviceManager);

      return databaseService;

    } catch (error) {
      console.error('Could not create DatabaseService:', error.message);
      throw error;
    }
  }
}

module.exports = DatabaseServiceFactory;
