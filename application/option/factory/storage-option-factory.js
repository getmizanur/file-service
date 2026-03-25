// application/option/factory/storage-option-factory.js
const AbstractFactory = require(globalThis.applicationPath('/library/mvc/service/abstract-factory'));
const StorageOption = require(globalThis.applicationPath('/application/option/storage-option'));

class StorageOptionFactory extends AbstractFactory {

  createService(serviceManager) {
    const config = serviceManager.get('config');
    const storageOptionConfig = this.getNestedConfig(config, 'storage_option', {});
    return new StorageOption(storageOptionConfig);
  }

  getRequiredConfigKeys() {
    return ['storage_option'];
  }

  validateConfiguration(config) {
    const threshold = this.getNestedConfig(config, 'storage_option.multipart_threshold');
    if (threshold !== null && typeof threshold !== 'number') {
      console.error('storage_option.multipart_threshold must be a number or null');
      return false;
    }

    const partSize = this.getNestedConfig(config, 'storage_option.part_size');
    if (partSize !== null && typeof partSize !== 'number') {
      console.error('storage_option.part_size must be a number or null');
      return false;
    }

    const queueSize = this.getNestedConfig(config, 'storage_option.queue_size');
    if (queueSize !== null && typeof queueSize !== 'number') {
      console.error('storage_option.queue_size must be a number or null');
      return false;
    }

    return true;
  }
}

module.exports = StorageOptionFactory;
