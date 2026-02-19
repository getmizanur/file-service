const ApiKeyTable = require('../api-key-table');
const ClassMethodsHydrator = require(
  global.applicationPath('/library/db/hydrator/class-methods-hydrator')
);

class ApiKeyTableFactory {
  createService(serviceManager) {
    const adapter = serviceManager.get('DbAdapter');

    return new ApiKeyTable({
      adapter,
      hydrator: new ClassMethodsHydrator()
    });
  }
}

module.exports = ApiKeyTableFactory;
