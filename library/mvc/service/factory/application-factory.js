const AbstractFactory = require("../abstract-factory");
const Application = require("../../../core/application");

class ApplicationFactory extends AbstractFactory {
  createService(serviceManager) {
    let config = serviceManager.get('Config');

    const app = new Application(config, serviceManager);

    return app;
  }
}

module.exports = ApplicationFactory