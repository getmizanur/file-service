// application/option/thumbnail-option.js
const AbstractOption = require(
  global.applicationPath('/library/core/common/abstract-option')
);

class ThumbnailOption extends AbstractOption {
  constructor(options = {}) {
    super(options);
  }

  setFormat(value) {
    this.format = value;
    return this;
  }

  getFormat() {
    return this.format;
  }

  setSizes(value) {
    this.sizes = value;
    return this;
  }

  getSizes() {
    return this.sizes;
  }
}

module.exports = ThumbnailOption;
