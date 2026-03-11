const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
const Integer = require(path.join(projectRoot, 'library/input-filter/validators/integer'));

describe('Integer', () => {

  describe('constructor', () => {
    it('should use defaults when no options provided', () => {
      const v = new Integer();
      expect(v.name).toBe('input');
      expect(v.max).toBeNull();
      expect(v.min).toBeNull();
    });

    it('should accept custom options', () => {
      const v = new Integer({ name: 'age', min: 1, max: 150 });
      expect(v.name).toBe('age');
      expect(v.min).toBe(1);
      expect(v.max).toBe(150);
    });

    it('should treat min=0 as falsy (becomes null due to || null)', () => {
      const v = new Integer({ name: 'age', min: 0 });
      expect(v.min).toBeNull();
    });
  });

  describe('isValid', () => {
    it('should return false for null', () => {
      const v = new Integer();
      expect(v.isValid(null)).toBe(false);
      expect(v.message).toBe(v.messageTemplate.NOT_INT);
    });

    it('should return false for undefined', () => {
      const v = new Integer();
      expect(v.isValid(undefined)).toBe(false);
      expect(v.message).toBe(v.messageTemplate.NOT_INT);
    });

    it('should return true for valid integer string', () => {
      const v = new Integer();
      expect(v.isValid('42')).toBe(true);
    });

    it('should return true for negative integer string', () => {
      const v = new Integer();
      expect(v.isValid('-10')).toBe(true);
    });

    it('should return true for integer number', () => {
      const v = new Integer();
      expect(v.isValid(42)).toBe(true);
    });

    it('should return false for float string', () => {
      const v = new Integer();
      expect(v.isValid('3.14')).toBe(false);
      expect(v.message).toBe(v.messageTemplate.NOT_INT);
    });

    it('should return false for non-numeric string', () => {
      const v = new Integer();
      expect(v.isValid('abc')).toBe(false);
      expect(v.message).toBe(v.messageTemplate.NOT_INT);
    });

    it('should return false for empty string', () => {
      const v = new Integer();
      expect(v.isValid('')).toBe(false);
    });

    it('should return true for string with leading/trailing whitespace', () => {
      const v = new Integer();
      expect(v.isValid('  42  ')).toBe(true);
    });

    it('should return false when parseInt produces NaN (lines 70-71)', () => {
      const v = new Integer();
      const originalParseInt = Number.parseInt;
      Number.parseInt = () => NaN;
      expect(v.isValid('42')).toBe(false);
      expect(v.message).toBe(v.messageTemplate.NOT_INT);
      Number.parseInt = originalParseInt;
    });

    it('should validate min boundary', () => {
      const v = new Integer({ min: 10 });
      expect(v.isValid('5')).toBe(false);
      expect(v.message).toBe(v.messageTemplate.NOT_GREATER);
    });

    it('should validate max boundary', () => {
      const v = new Integer({ max: 100 });
      expect(v.isValid('150')).toBe(false);
      expect(v.message).toBe(v.messageTemplate.NOT_LESS);
    });

    it('should return true when value is within min and max', () => {
      const v = new Integer({ min: 1, max: 100 });
      expect(v.isValid('50')).toBe(true);
    });

    it('should return true when value equals min', () => {
      const v = new Integer({ min: 10 });
      expect(v.isValid('10')).toBe(true);
    });

    it('should return true when value equals max', () => {
      const v = new Integer({ max: 100 });
      expect(v.isValid('100')).toBe(true);
    });
  });

  describe('setMin', () => {
    it('should set min value', () => {
      const v = new Integer();
      v.setMin(5);
      expect(v.getMin()).toBe(5);
    });

    it('should throw when min is greater than max', () => {
      const v = new Integer({ max: 10 });
      expect(() => v.setMin(20)).toThrow();
    });
  });

  describe('setMax', () => {
    it('should set max value', () => {
      const v = new Integer();
      v.setMax(100);
      expect(v.getMax()).toBe(100);
    });

    it('should throw when max is less than min', () => {
      const v = new Integer({ min: 10 });
      expect(() => v.setMax(5)).toThrow();
    });
  });

  describe('getMin / getMax', () => {
    it('should return null by default', () => {
      const v = new Integer();
      expect(v.getMin()).toBeNull();
      expect(v.getMax()).toBeNull();
    });
  });

});
