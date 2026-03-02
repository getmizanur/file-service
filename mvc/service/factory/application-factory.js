// library/mvc/service/factory/application-factory.js
const AbstractFactory = require("../abstract-factory");
const Application = require("../../../core/application");

class ApplicationFactory extends AbstractFactory {
  createService(serviceManager) {
    if (!serviceManager || typeof serviceManager.get !== 'function') {
      throw new Error('ApplicationFactory: serviceManager is required');
    }

    let config;
    try {
      config = serviceManager.get('Config');
    } catch (e) {
      throw new Error("ApplicationFactory: 'Config' service is not registered (required to create Application)");
    }

    if (!config || typeof config !== 'object') {
      throw new Error("ApplicationFactory: invalid 'Config' service (expected an object)");
    }

    // Application can hold SM reference (like ZF2's Application holds ServiceManager)
    return new Application(config, serviceManager);
  }
}

module.exports = ApplicationFactory;