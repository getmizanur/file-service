// library/input-filter/validators/regex.js
const AbstractValidator = require('./abstract-validator');

class Regex extends AbstractValidator {

  constructor(options = {}) {
    super();
    this.pattern = options.pattern || null;
    this.message = null;
    this.messageTemplate = options.messageTemplate || {
      INVALID: 'The input does not match the required pattern'
    };
  }

  getPattern() {
    return this.pattern;
  }

  setPattern(pattern) {
    if(!(pattern instanceof RegExp)) {
      throw new Error('Pattern must be a valid regular expression');
    }
    this.pattern = pattern;
  }

  isValid(value) {
    if(!this.pattern) {
      throw new Error('Pattern is required for Regex validator');
    }

    // Convert value to string if it's not already
    const stringValue = String(value);

    // Test the value against the pattern
    if(!this.pattern.test(stringValue)) {
      this.message = this.messageTemplate.INVALID;
      return false;
    }

    return true;
  }

  getClass() {
    return this.constructor.name;
  }

}

module.exports = Regex;