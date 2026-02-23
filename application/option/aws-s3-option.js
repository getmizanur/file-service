// application/option/aws-s3-option.js
const AbstractOption = require(
  global.applicationPath('/library/core/common/abstract-option')
);
const ProductionOption = require('./production-option');
const DevelopmentOption = require('./development-option');

class AwsS3Option extends AbstractOption {
  constructor(options = {}) {
    super(options);
  }

  setProduction(options) {
    this.productionOption = new ProductionOption(options);
    return this;
  }

  setDevelopment(options) {
    this.developmentOption = new DevelopmentOption(options);
    return this;
  }

  getProduction() {
    return this.productionOption;
  }

  getDevelopment() {
    return this.developmentOption;
  }
}

module.exports = AwsS3Option;