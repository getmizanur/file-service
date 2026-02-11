const AbstractValidator = require('./abstract-validator');

class AlphaNumeric extends AbstractValidator {

  constructor(options = {}) {
    super();
    this.name = options.name || 'input';
    this.allowWhiteSpace = options.allowWhiteSpace || false;
    this.allowDashAndUnderscore = options.allowDashAndUnderscore || false;

    this.message = null;
    this.messageTemplate = options.messageTemplate || {
      INVALID: `Invalid type is given. String expected`,
      INVALID_FORMAT: `The ${this.name} is not a valid AlphaNumeric string`
    }
  }

  isValid(value) {
    if(typeof value !== 'string') {
      this.message = this.messageTemplate.INVALID;
      return false;
    }

    let regexp = null;

    if(this.allowDashAndUnderscore) {
      regexp = /^[a-zA-Z0-9-_]+$/;
    }

    if(this.allowWhiteSpace) {
      regexp = /^[a-zA-Z0-9\s]+$/;
    }

    if(regexp == null) {
      regexp = /^[a-zA-Z0-9]+$/;
    }

    if(value.search(regexp) === -1) {
      this.message = this.messageTemplate.INVALID_FORMAT;
      return false;
    }

    return true;
  }

  setMessage(message, key) {
    if(key && this.messageTemplate.hasOwnProperty(key)) {
      this.messageTemplate[key] = message;
    }
  }

  getClass() {
    return this.constructor.name;
  }

}

module.exports = AlphaNumeric