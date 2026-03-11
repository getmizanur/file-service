const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
const StringLength = require(path.join(projectRoot, 'library/input-filter/validators/string-length'));

describe('StringLength', () => {

  // Suppress console.log from the validator
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterAll(() => {
    console.log.mockRestore();
  });

  describe('constructor', () => {
    it('should use defaults when no options provided', () => {
      const v = new StringLength();
      expect(v.name).toBe('input');
      expect(v.min).toBeNull();
      expect(v.max).toBeNull();
      expect(v.length).toBeNull();
    });

    it('should accept custom options', () => {
      const v = new StringLength({ name: 'title', min: 3, max: 100 });
      expect(v.name).toBe('title');
      expect(v.min).toBe(3);
      expect(v.max).toBe(100);
    });

    it('should accept custom messageTemplate', () => {
      const tpl = { INVALID_FORMAT: 'cf', INVALID_TOO_SHORT: 'cs', INVALID_TOO_LONG: 'cl' };
      const v = new StringLength({ messageTemplate: tpl });
      expect(v.messageTemplate).toBe(tpl);
    });
  });

  describe('isValid', () => {
    it('should handle falsy value in log statement (branch line 58)', () => {
      const v = new StringLength();
      // Pass a value that is truthy but test the branch
      // The ternary `value ? value.length : 0` on line 58 - test with falsy
      // Note: calling isValid with null/undefined will throw on `.length`, so line 58 branch
      // is for the console.log only. We can't pass null since line 61 does value.length.
      // This branch in the console.log is just cosmetic. Test empty string instead.
      expect(v.isValid('')).toBe(true);
    });

    it('should return true when no min or max is set', () => {
      const v = new StringLength();
      expect(v.isValid('anything')).toBe(true);
    });

    it('should return false when value is shorter than min', () => {
      const v = new StringLength({ min: 5 });
      expect(v.isValid('ab')).toBe(false);
      expect(v.message).toBe(v.messageTemplate.INVALID_TOO_SHORT);
    });

    it('should return false when value is longer than max', () => {
      const v = new StringLength({ max: 5 });
      expect(v.isValid('toolongstring')).toBe(false);
      expect(v.message).toBe(v.messageTemplate.INVALID_TOO_LONG);
    });

    it('should return true when value length equals min', () => {
      const v = new StringLength({ min: 3 });
      expect(v.isValid('abc')).toBe(true);
    });

    it('should return true when value length equals max', () => {
      const v = new StringLength({ max: 5 });
      expect(v.isValid('abcde')).toBe(true);
    });

    it('should return true when value length is within min and max', () => {
      const v = new StringLength({ min: 2, max: 10 });
      expect(v.isValid('hello')).toBe(true);
    });

    it('should set the length property after validation', () => {
      const v = new StringLength();
      v.isValid('test');
      expect(v.getLength()).toBe(4);
    });
  });

  describe('setMin / getMin', () => {
    it('should set and get min', () => {
      const v = new StringLength();
      v.setMin(3);
      expect(v.getMin()).toBe(3);
    });

    it('should throw when min is greater than max', () => {
      const v = new StringLength({ max: 5 });
      expect(() => v.setMin(10)).toThrow();
    });
  });

  describe('setMax / getMax', () => {
    it('should set and get max', () => {
      const v = new StringLength();
      v.setMax(100);
      expect(v.getMax()).toBe(100);
    });

    it('should throw when max is less than min', () => {
      const v = new StringLength({ min: 10 });
      expect(() => v.setMax(5)).toThrow();
    });
  });

  describe('setLength / getLength', () => {
    it('should set and get length', () => {
      const v = new StringLength();
      v.setLength(42);
      expect(v.getLength()).toBe(42);
    });
  });

  describe('setMessage', () => {
    it('should update an existing message template key', () => {
      const v = new StringLength();
      v.setMessage('Too short!', 'INVALID_TOO_SHORT');
      expect(v.messageTemplate.INVALID_TOO_SHORT).toBe('Too short!');
    });

    it('should not add a new key that does not exist', () => {
      const v = new StringLength();
      v.setMessage('test', 'NONEXISTENT');
      expect(v.messageTemplate.NONEXISTENT).toBeUndefined();
    });

    it('should do nothing when key is falsy', () => {
      const v = new StringLength();
      const original = v.messageTemplate.INVALID_TOO_SHORT;
      v.setMessage('test', null);
      expect(v.messageTemplate.INVALID_TOO_SHORT).toBe(original);
    });
  });

  describe('getClass', () => {
    it('should return the constructor name', () => {
      const v = new StringLength();
      expect(v.getClass()).toBe('StringLength');
    });
  });

});
