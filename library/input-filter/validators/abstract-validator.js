class AbstractValidator {

  isValid(...args) {
    throw new Error(`isValid() method must be implemented by ${this.constructor.name}`);
  }

}

module.exports = AbstractValidator;