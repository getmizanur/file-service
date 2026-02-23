// application/option/kms-option.js
const AbstractOption = require(
  global.applicationPath('/library/core/common/abstract-option')
);

class KmsOption extends AbstractOption {
  constructor(options = {}) {
    super(options);
  }

  setEnabled(value) {
    this.enabled = value;
    return this;
  }

  getEnabled() {
    return this.enabled;
  }

  isEnabled() {
    return !!this.enabled;
  }

  setKeyId(value) {
    this.keyId = value;
    return this;
  }

  getKeyId() {
    return this.keyId;
  }
}

module.exports = KmsOption;
