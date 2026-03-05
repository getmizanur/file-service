// application/option/tags-option.js
const AbstractOption = require(
  global.applicationPath('/library/core/common/abstract-option')
);

class TagsOption extends AbstractOption {
  constructor(options = {}) {
    super(options);
  }

  setEnvironment(value) {
    this.environment = value;
    return this;
  }

  getEnvironment() {
    return this.environment;
  }

  setApp(value) {
    this.app = value;
    return this;
  }

  getApp() {
    return this.app;
  }
}

module.exports = TagsOption;
