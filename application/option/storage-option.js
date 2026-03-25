// application/option/storage-option.js
const AbstractOption = require(globalThis.applicationPath('/library/core/common/abstract-option'));

class StorageOption extends AbstractOption {
  constructor(options = {}) {
    super(options);
  }

  setMultipartThreshold(value) {
    this.multipartThreshold = value;
    return this;
  }

  getMultipartThreshold() {
    return this.multipartThreshold || 52428800; // 50MB
  }

  setPartSize(value) {
    this.partSize = value;
    return this;
  }

  getPartSize() {
    return this.partSize || 10485760; // 10MB
  }

  setQueueSize(value) {
    this.queueSize = value;
    return this;
  }

  getQueueSize() {
    return this.queueSize || 4;
  }
}

module.exports = StorageOption;
