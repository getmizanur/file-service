const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const StringLength = require(path.join(projectRoot, 'library/input-filter/validators/string-length'));

describe('StringLength Validator', () => {

  describe('constructor', () => {
    it('should set default values', () => {
      const v = new StringLength();
      expect(v.name).toBe('input');
      expect(v.getMin()).toBeNull();
      expect(v.getMax()).toBeNull();
    });

    it('should accept min and max options', () => {
      const v = new StringLength({ min: 3, max: 10 });
      expect(v.getMin()).toBe(3);
      expect(v.getMax()).toBe(10);
    });

    it('should accept custom name', () => {
      const v = new StringLength({ name: 'username' });
      expect(v.name).toBe('username');
    });

    it('should accept custom messageTemplate', () => {
      const v = new StringLength({
        messageTemplate: { INVALID_TOO_SHORT: 'Short!' },
      });
      expect(v.messageTemplate.INVALID_TOO_SHORT).toBe('Short!');
    });
  });

  describe('setMin() / getMin()', () => {
    it('should set and get min', () => {
      const v = new StringLength();
      v.setMin(5);
      expect(v.getMin()).toBe(5);
    });

    it('should throw when min > max', () => {
      const v = new StringLength({ max: 5 });
      expect(() => v.setMin(10)).toThrow(
        'The minimum must be less than or equal to the maximum length, but 10 > 5'
      );
    });

    it('should allow min equal to max', () => {
      const v = new StringLength({ max: 5 });
      v.setMin(5);
      expect(v.getMin()).toBe(5);
    });
  });

  describe('setMax() / getMax()', () => {
    it('should set and get max', () => {
      const v = new StringLength();
      v.setMax(20);
      expect(v.getMax()).toBe(20);
    });

    it('should throw when max < min', () => {
      const v = new StringLength({ min: 5 });
      expect(() => v.setMax(3)).toThrow(
        'The maximum must be greater than or equal to the minimum length, but 3 < 5'
      );
    });

    it('should allow max equal to min', () => {
      const v = new StringLength({ min: 5 });
      v.setMax(5);
      expect(v.getMax()).toBe(5);
    });
  });

  describe('getLength() / setLength()', () => {
    it('should track length after validation', () => {
      const v = new StringLength({ min: 1 });
      v.isValid('hello');
      expect(v.getLength()).toBe(5);
    });

    it('should set length explicitly', () => {
      const v = new StringLength();
      v.setLength(10);
      expect(v.getLength()).toBe(10);
    });
  });

  describe('isValid()', () => {
    it('should return true for string within range', () => {
      const v = new StringLength({ min: 3, max: 10 });
      expect(v.isValid('hello')).toBe(true);
    });

    it('should return true for string at min boundary', () => {
      const v = new StringLength({ min: 5, max: 10 });
      expect(v.isValid('hello')).toBe(true);
    });

    it('should return true for string at max boundary', () => {
      const v = new StringLength({ min: 1, max: 5 });
      expect(v.isValid('hello')).toBe(true);
    });

    it('should return false for string shorter than min', () => {
      const v = new StringLength({ min: 5 });
      expect(v.isValid('hi')).toBe(false);
      expect(v.message).toBe(v.messageTemplate.INVALID_TOO_SHORT);
    });

    it('should return false for string longer than max', () => {
      const v = new StringLength({ max: 3 });
      expect(v.isValid('hello world')).toBe(false);
      expect(v.message).toBe(v.messageTemplate.INVALID_TOO_LONG);
    });

    it('should return true when only min is set and string is long enough', () => {
      const v = new StringLength({ min: 3 });
      expect(v.isValid('hello')).toBe(true);
    });

    it('should return true when only max is set and string is short enough', () => {
      const v = new StringLength({ max: 10 });
      expect(v.isValid('hello')).toBe(true);
    });

    it('should return true when no min or max set', () => {
      const v = new StringLength();
      expect(v.isValid('anything')).toBe(true);
    });

    it('should return true for empty string when min is 0', () => {
      const v = new StringLength({ min: 0, max: 10 });
      expect(v.isValid('')).toBe(true);
    });
  });

  describe('setMessage()', () => {
    it('should set message for a valid key', () => {
      const v = new StringLength();
      v.setMessage('Too short!', 'INVALID_TOO_SHORT');
      expect(v.messageTemplate.INVALID_TOO_SHORT).toBe('Too short!');
    });

    it('should not set message for invalid key', () => {
      const v = new StringLength();
      const original = { ...v.messageTemplate };
      v.setMessage('msg', 'NONEXISTENT_KEY');
      expect(v.messageTemplate).toEqual(original);
    });

    it('should use custom message during validation', () => {
      const v = new StringLength({ min: 5 });
      v.setMessage('Way too short', 'INVALID_TOO_SHORT');
      v.isValid('hi');
      expect(v.message).toBe('Way too short');
    });
  });

  describe('getClass()', () => {
    it('should return "StringLength"', () => {
      const v = new StringLength();
      expect(v.getClass()).toBe('StringLength');
    });
  });
});
