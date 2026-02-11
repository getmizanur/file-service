const AbstractValidator = require('./abstract-validator');

class Identical extends AbstractValidator {

  constructor(options = {}) {
    super();
    this.name = options.name || 'input';
    this.token = options.token;

    this.message = null;
    this.messageTemplate = {
      NOT_SAME: 'The two given tokens do not match',
      MISSING_TOKEN: 'No token was provided to match against',
      INVALID_TOKEN: 'The token was provided, but it was not in the data set'
    }
  }

  getToken() {
    return this.token;
  }

  setToken(token) {
    this.token = token;
  }

  isValid(value, context) {
    if(this.getToken() == null) {
      this.message = this.messageTemplate.MISSING_TOKEN;
      return false;
    }

    if(!context.hasOwnProperty(this.getToken())) {
      this.message = this.messageTemplate.INVALID_TOKEN;
      return false;
    }

    let tokval = context[this.getToken()];
    if(tokval != value) {
      this.message = this.messageTemplate.NOT_SAME;
      return false;
    }

    return true;
  }

}

module.exports = Identical