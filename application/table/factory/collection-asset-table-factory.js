// application/table/factory/collection-asset-table-factory.js
const CollectionAssetTable = require('../collection-asset-table');
const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class CollectionAssetTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new CollectionAssetTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = CollectionAssetTableFactory;
