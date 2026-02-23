// application/table/factory/file-derivative-table-factory.js
const FileDerivativeTable = require('../file-derivative-table');
const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class FileDerivativeTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new FileDerivativeTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = FileDerivativeTableFactory;
