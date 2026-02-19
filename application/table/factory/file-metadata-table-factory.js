// application/table/factory/file-metadata-table-factory.js

const FileMetadataTable = require('../file-metadata-table');

const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class FileMetadataTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new FileMetadataTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = FileMetadataTableFactory;