const FileStarTable = require('../file-star-table');
const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class FileStarTableFactory {

  createService(serviceManager) {

    const adapter = serviceManager.get('DbAdapter');

    return new FileStarTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = FileStarTableFactory;
