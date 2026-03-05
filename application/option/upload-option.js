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

  setMultipartPartSizeBytes(value) {
    this.multipartPartSizeBytes = value;
    return this;
  }

  getMultipartPartSizeBytes() {
    return this.multipartPartSizeBytes;
  }
}

module.exports = UploadOption;
