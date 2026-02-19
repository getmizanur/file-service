const AssetTagTable = require('../asset-tag-table');
const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class AssetTagTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new AssetTagTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = AssetTagTableFactory;
