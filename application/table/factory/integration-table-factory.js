// application/table/factory/integration-table-factory.js
const IntegrationTable = require('../integration-table');
const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class IntegrationTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new IntegrationTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = IntegrationTableFactory;
