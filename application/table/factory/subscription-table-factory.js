// application/table/factory/subscription-table-factory.js
const SubscriptionTable = require('../subscription-table');
const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class SubscriptionTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new SubscriptionTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = SubscriptionTableFactory;
