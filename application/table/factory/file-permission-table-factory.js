const FilePermissionTable = require('../file-permission-table');

const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class FilePermissionTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new FilePermissionTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = FilePermissionTableFactory;