// application/option/production-option.js
const AbstractOption = require(
  global.applicationPath('/library/core/common/abstract-option')
);
const ConnectionOption = require("./connection-option");

class ProductionOption extends AbstractOption {
  constructor(options = {}) {
    super(options);
  }

  getBucket() {
    return this.bucket;
  }

  setBucket(bucket) {
    this.bucket = bucket;
    return this;
  }

  getPrefix() {
    return this.prefix;
  }

  setPrefix(prefix) {
    this.prefix = prefix;
    return this;
  }

  getConnection() {
    return this.connection;
  }

  setConnection(connection) {
    this.connection = new ConnectionOption(connection);
    return this;
  }
}

module.exports = ProductionOption