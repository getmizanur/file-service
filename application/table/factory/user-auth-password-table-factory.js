// application/table/factory/user-auth-password-table-factory.js
const UserAuthPasswordTable = require('../user-auth-password-table');

const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class UserAuthPasswordTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new UserAuthPasswordTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = UserAuthPasswordTableFactory;