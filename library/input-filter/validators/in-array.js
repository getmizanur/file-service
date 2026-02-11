const AbstractValidator = require('./abstract-validator');

class InArray extends AbstractValidator {

  constructor(options = {}) {
    super();
    this.name = options.name || 'input';
    this.haystack = options.haystack;

    this.message = null;
    this.messageTemplate = {
      INVALID: 'Invalid type given. JSON object expected',
      NOT_IN_ARRAY: `The ${options.name} not found in the haystack`
    };

    this.customMessages = {};
  }

  getHaystack() {
    return this.haystack;
  }

  isValid(value) {
    if(typeof value !== 'string') {
      this.message = this.messageTemplate.INVALID;
      return false;
    }

    const haystack = this.getHaystack();

    if(haystack.indexOf(value) >= 0) {
      return true;
    }

    this.message = this.customMessages.NOT_IN_ARRAY || this.messageTemplate.NOT_IN_ARRAY;
    return false;
  }

  /**
   * Set custom message for specific message key
   * @param {string} message 
   * @param {string} messageKey 
   */
  setMessage(message, messageKey = 'NOT_IN_ARRAY') {
    this.customMessages[messageKey] = message;
    return this;
  }

}

module.exports = InArray