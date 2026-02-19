const AppUserTable = require('../app-user-table');
const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class AppUserTableFactory {

  createService(serviceManager) {

    const adapter = serviceManager.get('DbAdapter');

    return new AppUserTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = AppUserTableFactory;
