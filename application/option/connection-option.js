// application/option/connection-option.js
const AbstractOption = require(
  global.applicationPath('/library/core/common/abstract-option')
);

class ConnectionOption extends AbstractOption {
  constructor(options = {}) {
    super(options);
  }

  setUser(user) {
    this.user = user;
    return this;
  }

  getUser() {
    return this.user;
  }
}

module.exports = ConnectionOption;