// application/option/derivative-option.js
const AbstractOption = require(globalThis.applicationPath('/library/core/common/abstract-option'));

class DerivativeOption extends AbstractOption {
  constructor(options = {}) {
    super(options);
  }

  setSofficeBin(value) {
    this.sofficeBin = value;
    return this;
  }

  getSofficeBin() {
    return this.sofficeBin || null;
  }
}

module.exports = DerivativeOption;
