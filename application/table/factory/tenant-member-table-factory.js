const TenantMemberTable = require('../tenant-member-table');

const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class TenantMemberTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new TenantMemberTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = TenantMemberTableFactory;