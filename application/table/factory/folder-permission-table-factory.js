// application/table/factory/folder-permission-table-factory.js
const FolderPermissionTable = require('../folder-permission-table');
const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class FolderPermissionTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new FolderPermissionTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = FolderPermissionTableFactory;
