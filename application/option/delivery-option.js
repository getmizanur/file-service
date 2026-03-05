// application/option/delivery-option.js
const AbstractOption = require(
  global.applicationPath('/library/core/common/abstract-option')
);

class DeliveryOption extends AbstractOption {
  constructor(options = {}) {
    super(options);
  }

  setMode(value) {
    this.mode = value;
    return this;
  }

  getMode() {
    return this.mode;
  }

  setOacEnabled(value) {
    this.oacEnabled = value;
    return this;
  }

  getOacEnabled() {
    return this.oacEnabled;
  }

  isOacEnabled() {
    return !!this.oacEnabled;
  }

  setCloudfrontDomain(value) {
    this.cloudfrontDomain = value;
    return this;
  }

  getCloudfrontDomain() {
    return this.cloudfrontDomain;
  }
}

module.exports = DeliveryOption;
