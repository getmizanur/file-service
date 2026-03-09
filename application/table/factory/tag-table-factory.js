// application/table/factory/tag-table-factory.js
const TagTable = require('../tag-table');
const ClassMethodsHydrator = require(
  globalThis.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class TagTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new TagTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = TagTableFactory;
