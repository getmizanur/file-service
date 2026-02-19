const FolderEventTable = require('../folder-event-table');
const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class FolderEventTableFactory {

  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new FolderEventTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = FolderEventTableFactory;
