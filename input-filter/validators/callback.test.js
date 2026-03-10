const Callback = require('./callback');

describe('Callback Validator', () => {

  it('should throw if no callback provided', () => {
    expect(() => new Callback({})).toThrow('Callback validator requires a valid callback function');
  });

  it('should throw if callback is not a function', () => {
    expect(() => new Callback({ callback: 'not a function' })).toThrow();
  });

  describe('boolean return', () => {
    let validator;
    beforeEach(() => {
      validator = new Callback({ callback: (value) => value.length > 5 });
    });

    it('should return true for valid value', () => {
      expect(validator.isValid('hello world')).toBe(true);
    });

    it('should return false for invalid value', () => {
      expect(validator.isValid('hi')).toBe(false);
    });

    it('should populate messages on failure', () => {
      validator.isValid('hi');
      expect(validator.getMessages().length).toBeGreaterThan(0);
    });
  });

  describe('object return with custom message', () => {
    let validator;
    beforeEach(() => {
      validator = new Callback({
        callback: (value) => {
          if (value.length < 5) {
            return { valid: false, message: 'Must be at least 5 characters' };
          }
          if (!/[A-Z]/.test(value)) {
            return { valid: false, message: 'Must contain uppercase' };
          }
          return { valid: true };
        }
      });
    });

    it('should return false when object.valid is false', () => {
      expect(validator.isValid('abc')).toBe(false);
    });

    it('should return true when object.valid is true', () => {
      expect(validator.isValid('Hello')).toBe(true);
    });

    it('should return false for missing uppercase', () => {
      expect(validator.isValid('hello')).toBe(false);
    });
  });

  describe('context parameter', () => {
    it('should pass context to callback', () => {
      const validator = new Callback({
        callback: (value, context) => value === context.password
      });

      expect(validator.isValid('pass123', { password: 'pass123' })).toBe(true);
      expect(validator.isValid('wrong', { password: 'pass123' })).toBe(false);
    });

    it('should default context to empty object', () => {
      const validator = new Callback({
        callback: (value, context) => typeof context === 'object'
      });

      expect(validator.isValid('test')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should return false when callback throws', () => {
      const validator = new Callback({
        callback: () => { throw new Error('boom'); }
      });

      expect(validator.isValid('test')).toBe(false);
      expect(validator.getMessages().length).toBeGreaterThan(0);
    });
  });

  describe('truthy/falsy coercion', () => {
    let validator;
    beforeEach(() => {
      validator = new Callback({ callback: (value) => value.length });
    });

    it('should treat truthy return as valid', () => {
      expect(validator.isValid('hello')).toBe(true);
    });

    it('should treat falsy 0 as valid (not strictly false)', () => {
      // 0 is falsy but not === false, so it returns true
      expect(validator.isValid('')).toBe(true);
    });
  });

  describe('custom message templates', () => {
    it('should use custom messageTemplate', () => {
      const validator = new Callback({
        callback: (value) => value.length > 5,
        messageTemplate: { INVALID: 'Custom invalid message' }
      });

      validator.isValid('hi');
      expect(validator.getMessages()).toContain('Custom invalid message');
    });
  });

  describe('getMessages and reset', () => {
    it('should reset messages on each isValid call', () => {
      const validator = new Callback({
        callback: (value) => value.length > 5
      });

      validator.isValid('hi');
      expect(validator.getMessages().length).toBeGreaterThan(0);

      validator.isValid('hello world');
      expect(validator.getMessages().length).toBe(0);
    });
  });
});
