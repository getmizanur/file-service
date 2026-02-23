// application/option/factory/storage-provider-option-factory.js
const AbstractFactory = require(global.applicationPath('/library/mvc/service/abstract-factory'));
const StorageProviderOption = require(global.applicationPath('/application/option/storage-provider-option'));

class StorageProviderOptionFactory extends AbstractFactory {

  createService(serviceManager) {
    const config = serviceManager.get('config');
    return new StorageProviderOption(config.storage_provider_option || {});
  }

}

module.exports = StorageProviderOptionFactory;
