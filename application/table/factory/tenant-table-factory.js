const TenantTable = require('../tenant-table');

const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class TenantTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new TenantTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = TenantTableFactory;