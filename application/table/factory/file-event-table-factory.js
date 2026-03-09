// application/table/factory/file-event-table-factory.js
const FileEventTable = require('../file-event-table');

const ClassMethodsHydrator = require(
  globalThis.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class FileEventTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new FileEventTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = FileEventTableFactory;