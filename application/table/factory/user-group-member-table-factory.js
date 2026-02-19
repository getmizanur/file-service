const UserGroupMemberTable = require('../user-group-member-table');
const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class UserGroupMemberTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new UserGroupMemberTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = UserGroupMemberTableFactory;
