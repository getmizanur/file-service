// application/table/factory/email-verification-token-table-factory.js
const EmailVerificationTokenTable = require('../email-verification-token-table');
const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class EmailVerificationTokenTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new EmailVerificationTokenTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = EmailVerificationTokenTableFactory;
