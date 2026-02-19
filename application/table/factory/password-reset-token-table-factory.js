const PasswordResetTokenTable = require('../password-reset-token-table');
const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class PasswordResetTokenTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new PasswordResetTokenTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = PasswordResetTokenTableFactory;
