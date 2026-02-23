// application/option/upload-option.js
const AbstractOption = require(
  global.applicationPath('/library/core/common/abstract-option')
);

class UploadOption extends AbstractOption {
  constructor(options = {}) {
    super(options);
  }

  setUseMultipartAboveBytes(value) {
    this.useMultipartAboveBytes = value;
    return this;
  }

  getUseMultipartAboveBytes() {
    return this.useMultipartAboveBytes;
  }
}

module.exports = UploadOption;
