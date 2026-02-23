// application/table/factory/storage-backend-table-factory.js
const StorageBackendTable = require('../storage-backend-table');

const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class StorageBackendTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new StorageBackendTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = StorageBackendTableFactory;