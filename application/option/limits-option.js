// application/option/limits-option.js
const AbstractOption = require(
  global.applicationPath('/library/core/common/abstract-option')
);

class LimitsOption extends AbstractOption {
  constructor(options = {}) {
    super(options);
  }

  setMaxUploadBytes(value) {
    this.maxUploadBytes = value;
    return this;
  }

  getMaxUploadBytes() {
    return this.maxUploadBytes;
  }
}

module.exports = LimitsOption;
