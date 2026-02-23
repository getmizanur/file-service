// application/option/storage-provider-option.js
const AbstractOption = require(
  global.applicationPath('/library/core/common/abstract-option')
);
const AwsS3Option = require('./aws-s3-option');

class StorageProviderOption extends AbstractOption {
  constructor(options = {}) {
    super(options);
  }

  setAwsS3(options) {
    this.awsS3 = new AwsS3Option(options);
    return this;
  }

  getAwsS3() {
    return this.awsS3;
  }
}

module.exports = StorageProviderOption;
