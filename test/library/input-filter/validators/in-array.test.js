const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const InArray = require(path.join(projectRoot, 'library/input-filter/validators/in-array'));

describe('InArray Validator', () => {

  let validator;

  beforeEach(() => {
    validator = new InArray({ name: 'color', haystack: ['red', 'green', 'blue'] });
  });

  describe('constructor', () => {
    it('should set name from options', () => {
      expect(validator.name).toBe('color');
    });

    it('should default name to "input"', () => {
      const v = new InArray({ haystack: [] });
      expect(v.name).toBe('input');
    });

    it('should store haystack', () => {
      expect(validator.getHaystack()).toEqual(['red', 'green', 'blue']);
    });

    it('should initialize message to null', () => {
      expect(validator.message).toBeNull();
    });
  });

  describe('getHaystack()', () => {
    it('should return the haystack array', () => {
      expect(validator.getHaystack()).toEqual(['red', 'green', 'blue']);
    });
  });

  describe('isValid()', () => {
    it('should return true for value in haystack', () => {
      expect(validator.isValid('red')).toBe(true);
    });

    it('should return true for another value in haystack', () => {
      expect(validator.isValid('blue')).toBe(true);
    });

    it('should return false for value not in haystack', () => {
      expect(validator.isValid('yellow')).toBe(false);
      expect(validator.message).toContain('not found in the haystack');
    });

    it('should return false for non-string input', () => {
      expect(validator.isValid(123)).toBe(false);
      expect(validator.message).toBe(validator.messageTemplate.INVALID);
    });

    it('should return false for null input', () => {
      expect(validator.isValid(null)).toBe(false);
    });

    it('should return false for undefined input', () => {
      expect(validator.isValid(undefined)).toBe(false);
    });
  });

  describe('setMessage()', () => {
    it('should set custom NOT_IN_ARRAY message', () => {
      validator.setMessage('Not a valid color', 'NOT_IN_ARRAY');
      validator.isValid('yellow');
      expect(validator.message).toBe('Not a valid color');
    });

    it('should default to NOT_IN_ARRAY key', () => {
      validator.setMessage('Invalid choice');
      validator.isValid('purple');
      expect(validator.message).toBe('Invalid choice');
    });

    it('should be chainable', () => {
      expect(validator.setMessage('msg')).toBe(validator);
    });

    it('should use custom message over template', () => {
      validator.setMessage('Custom error', 'NOT_IN_ARRAY');
      validator.isValid('invalid');
      expect(validator.message).toBe('Custom error');
    });
  });

  describe('constructor default options (line 6)', () => {
    it('should use default empty object when no options provided', () => {
      const v = new InArray();
      expect(v.name).toBe('input');
      expect(v.haystack).toBeUndefined();
    });
  });
});
