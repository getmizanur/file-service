// application/table/factory/user-group-table-factory.js
const UserGroupTable = require('../user-group-table');
const ClassMethodsHydrator = require(
  globalThis.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class UserGroupTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new UserGroupTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = UserGroupTableFactory;
