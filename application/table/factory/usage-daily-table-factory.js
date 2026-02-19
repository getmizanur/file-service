const UsageDailyTable = require('../usage-daily-table');
const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class UsageDailyTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new UsageDailyTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = UsageDailyTableFactory;
