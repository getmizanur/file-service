const PlanTable = require('../plan-table');
const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class PlanTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new PlanTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = PlanTableFactory;
