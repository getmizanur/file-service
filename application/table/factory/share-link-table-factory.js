// application/table/factory/share-link-table-factory.js
const ShareLinkTable = require('../share-link-table');

const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class ShareLinkTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new ShareLinkTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = ShareLinkTableFactory;