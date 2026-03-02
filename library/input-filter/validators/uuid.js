// library/input-filter/validators/uuid.js
const AbstractValidator = require('./abstract-validator');

class Uuid extends AbstractValidator {

  constructor(options = {}) {
    super();
    this.name = options.name || 'input';

    this.message = null;
    this.messageTemplate = options.messageTemplate || {
      INVALID: `The ${this.name} type is invalid. String expected`,
      INVALID_FORMAT: `The ${this.name} is not a valid UUID string`
    }
  }

  isValid(value) {
    if(typeof value !== 'string') {
      this.message = this.messageTemplate.INVALID;
      return false;
    }

    let regexp = /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/;

    if(value.search(regexp) === -1) {
      this.message = this.messageTemplate.INVALID_FORMAT;
      return false;
    }

    return true;
  }

}

module.exports = Uuid