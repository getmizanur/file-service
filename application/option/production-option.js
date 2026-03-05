// application/option/production-option.js
const AbstractOption = require(
  global.applicationPath('/library/core/common/abstract-option')
);
const KmsOption = require('./kms-option');
const UploadOption = require('./upload-option');
const LimitsOption = require('./limits-option');
const DeliveryOption = require('./delivery-option');
const ContentDefaultsOption = require('./content-defaults-option');
const TagsOption = require('./tags-option');

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

  setKeyPrefix(value) {
    this.keyPrefix = value;
    return this;
  }

  getKeyPrefix() {
    return this.keyPrefix;
  }

  setPathTemplateVersion(value) {
    this.pathTemplateVersion = value;
    return this;
  }

  getPathTemplateVersion() {
    return this.pathTemplateVersion;
  }

  setDelivery(options) {
    this.delivery = new DeliveryOption(options);
    return this;
  }

  getDelivery() {
    return this.delivery;
  }

  setContentDefaults(options) {
    this.contentDefaults = new ContentDefaultsOption(options);
    return this;
  }

  getContentDefaults() {
    return this.contentDefaults;
  }

  setTags(options) {
    this.tags = new TagsOption(options);
    return this;
  }

  getTags() {
    return this.tags;
  }
}

module.exports = ProductionOption;
