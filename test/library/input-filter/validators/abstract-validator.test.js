const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const AbstractValidator = require(path.join(projectRoot, 'library/input-filter/validators/abstract-validator'));

describe('AbstractValidator', () => {

  describe('isValid()', () => {
    it('should throw an error indicating it must be implemented', () => {
      const validator = new AbstractValidator();
      expect(() => validator.isValid('test')).toThrow(
        'isValid() method must be implemented by AbstractValidator'
      );
    });

    it('should include the subclass name when extended', () => {
      class MyValidator extends AbstractValidator {}
      const validator = new MyValidator();
      expect(() => validator.isValid('test')).toThrow(
        'isValid() method must be implemented by MyValidator'
      );
    });
  });
});
