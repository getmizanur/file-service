const IntegrationPolicyOverrideTable = require('../integration-policy-override-table');
const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class IntegrationPolicyOverrideTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new IntegrationPolicyOverrideTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = IntegrationPolicyOverrideTableFactory;
