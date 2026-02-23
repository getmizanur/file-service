// application/table/factory/tenant-policy-table-factory.js
const TenantPolicyTable = require('../tenant-policy-table');

const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class TenantPolicyTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new TenantPolicyTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = TenantPolicyTableFactory;