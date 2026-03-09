// library/input-filter/validators/email-address.js
const AbstractValidator = require('./abstract-validator');
const StringUtil = require('../../util/string-util');

class EmailAddress extends AbstractValidator {

  constructor(options = {}) {
    super();
    this.name = options.name || 'input';
    this.email = null;

    this.message = null;
    this.messageTemplate = options.messageTepmlate || {
      INVALID: `Invalid type given. String expected`,
      INVALID_FORMAT: `The ${this.name} is not a valid email address`
    }
  }

  isValid(value) {
    if(typeof value !== 'string') {
      this.message = this.messageTemplate.INVALID;
      return false;
    }

    this.email = value;

    const emailParts = this.email.split('@');

    if(emailParts.length !== 2) {
      this.message = this.messageTemplate.INVALID_FORMAT;
      return false;
    }

    const account = emailParts[0];
    const address = emailParts[1];

    const domainParts = address.split('.');
    const hasInvalidLength = account.length > 64 || address.length > 255 ||
      domainParts.some(part => part.length > 63);

    if(hasInvalidLength) {
      this.message = this.messageTemplate.INVALID_FORMAT;
      return false;
    }

    const tester = /^[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

    if(!tester.test(this.email)) {
      this.message = this.messageTemplate.INVALID_FORMAT;
      return false;
    }

    this.message = 'Valid email address'

    return true;
  }

  /**
   * Set custom message for specific message key
   * @param {string} message 
   * @param {string} messageKey 
   */
  setMessage(message, messageKey = 'INVALID_FORMAT') {
    this.messageTemplate[messageKey] = message;
    return this;
  }

  getClass() {
    return this.constructor.name;
  }

}

module.exports = EmailAddress