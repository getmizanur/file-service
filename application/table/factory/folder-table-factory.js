// application/table/factory/folder-table-factory.js
const FolderTable = require('../folder-table');
const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class FolderTableFactory {

  createService(serviceManager) {

    const adapter = serviceManager.get('DbAdapter');

    return new FolderTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = FolderTableFactory;
