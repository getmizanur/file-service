// application/option/production-option.js
const AbstractOption = require(
  global.applicationPath('/library/core/common/abstract-option')
);
const KmsOption = require('./kms-option');
const UploadOption = require('./upload-option');
const LimitsOption = require('./limits-option');

class ProductionOption extends AbstractOption {
  constructor(options = {}) {
    super(options);
  }

  setBucket(value) {
    this.bucket = value;
    return this;
  }

  getBucket() {
    return this.bucket;
  }

  setRegion(value) {
    this.region = value;
    return this;
  }

  getRegion() {
    return this.region;
  }

  setPrefix(value) {
    this.prefix = value;
    return this;
  }

  getPrefix() {
    return this.prefix;
  }

  setKms(options) {
    this.kms = new KmsOption(options);
    return this;
  }

  getKms() {
    return this.kms;
  }

  setUpload(options) {
    this.upload = new UploadOption(options);
    return this;
  }

  getUpload() {
    return this.upload;
  }

  setLimits(options) {
    this.limits = new LimitsOption(options);
    return this;
  }

  getLimits() {
    return this.limits;
  }
}

module.exports = ProductionOption;
