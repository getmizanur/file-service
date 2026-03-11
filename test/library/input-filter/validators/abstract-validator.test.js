const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
const AbstractValidator = require(path.join(projectRoot, 'library/input-filter/validators/abstract-validator'));

describe('AbstractValidator', () => {

  it('should throw an error when isValid is called directly', () => {
    const validator = new AbstractValidator();
    expect(() => validator.isValid('test')).toThrow('isValid() method must be implemented by AbstractValidator');
  });

  it('should include the subclass name in the error message', () => {
    class MyValidator extends AbstractValidator {}
    const validator = new MyValidator();
    expect(() => validator.isValid('test')).toThrow('isValid() method must be implemented by MyValidator');
  });

  it('should accept any number of arguments without affecting the error', () => {
    const validator = new AbstractValidator();
    expect(() => validator.isValid()).toThrow();
    expect(() => validator.isValid('a', 'b', 'c')).toThrow();
  });

});
