const FolderShareLinkTable = require('../folder-share-link-table');
const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class FolderShareLinkTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new FolderShareLinkTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = FolderShareLinkTableFactory;
