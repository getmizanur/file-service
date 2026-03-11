const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
const Regex = require(path.join(projectRoot, 'library/input-filter/validators/regex'));

describe('Regex', () => {

  describe('constructor', () => {
    it('should use defaults when no options provided', () => {
      const v = new Regex();
      expect(v.pattern).toBeNull();
      expect(v.message).toBeNull();
      expect(v.messageTemplate.INVALID).toBe('The input does not match the required pattern');
    });

    it('should accept pattern and custom messageTemplate', () => {
      const pattern = /^[a-z]+$/;
      const tpl = { INVALID: 'Custom error' };
      const v = new Regex({ pattern, messageTemplate: tpl });
      expect(v.pattern).toBe(pattern);
      expect(v.messageTemplate.INVALID).toBe('Custom error');
    });
  });

  describe('getPattern / setPattern', () => {
    it('should get and set pattern', () => {
      const v = new Regex();
      const pattern = /^\d+$/;
      v.setPattern(pattern);
      expect(v.getPattern()).toBe(pattern);
    });

    it('should throw TypeError when pattern is not a RegExp', () => {
      const v = new Regex();
      expect(() => v.setPattern('not-a-regex')).toThrow(TypeError);
      expect(() => v.setPattern('not-a-regex')).toThrow('Pattern must be a valid regular expression');
    });

    it('should throw TypeError for null', () => {
      const v = new Regex();
      expect(() => v.setPattern(null)).toThrow(TypeError);
    });
  });

  describe('isValid', () => {
    it('should throw when no pattern is set', () => {
      const v = new Regex();
      expect(() => v.isValid('test')).toThrow('Pattern is required for Regex validator');
    });

    it('should return true when value matches pattern', () => {
      const v = new Regex({ pattern: /^[a-z]+$/ });
      expect(v.isValid('hello')).toBe(true);
    });

    it('should return false when value does not match pattern', () => {
      const v = new Regex({ pattern: /^[a-z]+$/ });
      expect(v.isValid('Hello123')).toBe(false);
      expect(v.message).toBe(v.messageTemplate.INVALID);
    });

    it('should convert non-string values to string before testing', () => {
      const v = new Regex({ pattern: /^\d+$/ });
      expect(v.isValid(12345)).toBe(true);
    });

    it('should work with complex patterns', () => {
      const v = new Regex({ pattern: /^\d{3}-\d{2}-\d{4}$/ });
      expect(v.isValid('123-45-6789')).toBe(true);
      expect(v.isValid('123-456-789')).toBe(false);
    });
  });

  describe('getClass', () => {
    it('should return the constructor name', () => {
      const v = new Regex();
      expect(v.getClass()).toBe('Regex');
    });
  });

});
