// application/table/factory/collection-table-factory.js
const CollectionTable = require('../collection-table');
const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class CollectionTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new CollectionTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = CollectionTableFactory;
