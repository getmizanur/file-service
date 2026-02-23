// library/input-filter/validators/string-length.js
const AbstractValidator = require('./abstract-validator');

class StringLength extends AbstractValidator {

  constructor(options = {}) {
    super();
    this.name = options.name || 'input';
    this.min = options.min || null;
    this.max = options.max || null;
    this.length = null;

    this.message = null;
    this.messageTemplate = options.messageTemplate || {
      INVALID_FORMAT: `The ${this.name} is not a valid AlphaNumeric string`,
      INVALID_TOO_SHORT: `The ${this.name} is less than ${this.min} characters long`,
      INVALID_TOO_LONG: `The ${this.name} is more than ${this.min} characters long`
    };
  }

  getMin() {
    return this.min;
  }

  setMin(min) {
    if(this.getMax() != null && min > this.getMax()) {
      throw new Error(
        `The minimum must be less than or equal to the maximum length, but ${min} > ${this.getMax()}`
      );
    }

    this.min = min;
  }

  getMax() {
    return this.max;
  }

  setMax(max) {
    if(max < this.getMin()) {
      throw new Error(
        `The maximum must be greater than or equal to the minimum length, but ${max} < ${this.getMin()}`
      );
    }

    this.max = max;
  }

  getLength() {
    return this.length;
  }

  setLength(length) {
    this.length = length;
  }

  isValid(value) {
    console.log(`[StringLength] Validating value: "${value}" (length: ${value ? value.length : 0})`);
    console.log(`[StringLength] Min: ${this.getMin()}, Max: ${this.getMax()}`);

    this.setLength(value.length);

    if(this.getMin() !== null && this.getLength() < this.getMin()) {
      console.log(`[StringLength] FAILED: Too short (${this.getLength()} < ${this.getMin()})`);
      this.message = this.messageTemplate.INVALID_TOO_SHORT;
      return false;
    }

    if(this.getMax() !== null && this.getLength() > this.getMax()) {
      console.log(`[StringLength] FAILED: Too long (${this.getLength()} > ${this.getMax()})`);
      this.message = this.messageTemplate.INVALID_TOO_LONG;
      return false;
    }

    console.log(`[StringLength] PASSED validation`);
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

module.exports = StringLength
