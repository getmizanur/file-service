// application/table/factory/folder-star-table-factory.js
const FolderStarTable = require('../folder-star-table');
const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class FolderStarTableFactory {

  createService(serviceManager) {

    const adapter = serviceManager.get('DbAdapter');

    return new FolderStarTable({
      adapter,
      hydrator: new ClassMethodsHydrator() // optional but recommended
    });
  }
}

module.exports = FolderStarTableFactory;