const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
const AlphaNumeric = require(path.join(projectRoot, 'library/input-filter/validators/alpha-numeric'));

describe('AlphaNumeric', () => {

  describe('constructor', () => {
    it('should use defaults when no options provided', () => {
      const v = new AlphaNumeric();
      expect(v.name).toBe('input');
      expect(v.allowWhiteSpace).toBe(false);
      expect(v.allowDashAndUnderscore).toBe(false);
      expect(v.message).toBeNull();
    });

    it('should accept custom options', () => {
      const v = new AlphaNumeric({ name: 'username', allowWhiteSpace: true, allowDashAndUnderscore: true });
      expect(v.name).toBe('username');
      expect(v.allowWhiteSpace).toBe(true);
      expect(v.allowDashAndUnderscore).toBe(true);
    });

    it('should accept custom messageTemplate', () => {
      const tpl = { INVALID: 'custom invalid', INVALID_FORMAT: 'custom format' };
      const v = new AlphaNumeric({ messageTemplate: tpl });
      expect(v.messageTemplate).toBe(tpl);
    });
  });

  describe('isValid', () => {
    it('should return false for non-string values', () => {
      const v = new AlphaNumeric();
      expect(v.isValid(123)).toBe(false);
      expect(v.message).toBe(v.messageTemplate.INVALID);
    });

    it('should return false for null', () => {
      const v = new AlphaNumeric();
      expect(v.isValid(null)).toBe(false);
    });

    it('should return true for alphanumeric strings', () => {
      const v = new AlphaNumeric();
      expect(v.isValid('abc123')).toBe(true);
    });

    it('should return false for strings with spaces by default', () => {
      const v = new AlphaNumeric();
      expect(v.isValid('abc 123')).toBe(false);
      expect(v.message).toBe(v.messageTemplate.INVALID_FORMAT);
    });

    it('should allow whitespace when allowWhiteSpace is true', () => {
      const v = new AlphaNumeric({ allowWhiteSpace: true });
      expect(v.isValid('abc 123')).toBe(true);
    });

    it('should reject dash/underscore when allowWhiteSpace is true', () => {
      const v = new AlphaNumeric({ allowWhiteSpace: true });
      expect(v.isValid('abc-123')).toBe(false);
    });

    it('should allow dash and underscore when allowDashAndUnderscore is true', () => {
      const v = new AlphaNumeric({ allowDashAndUnderscore: true });
      expect(v.isValid('abc-def_123')).toBe(true);
    });

    it('should return false for special characters', () => {
      const v = new AlphaNumeric();
      expect(v.isValid('abc@123')).toBe(false);
      expect(v.message).toBe(v.messageTemplate.INVALID_FORMAT);
    });

    it('should return false for empty string (default regexp)', () => {
      const v = new AlphaNumeric();
      expect(v.isValid('')).toBe(false);
    });
  });

  describe('setMessage', () => {
    it('should update an existing message template key', () => {
      const v = new AlphaNumeric();
      v.setMessage('New invalid msg', 'INVALID');
      expect(v.messageTemplate.INVALID).toBe('New invalid msg');
    });

    it('should not add a new key that does not exist', () => {
      const v = new AlphaNumeric();
      v.setMessage('test', 'NONEXISTENT');
      expect(v.messageTemplate.NONEXISTENT).toBeUndefined();
    });

    it('should do nothing when key is falsy', () => {
      const v = new AlphaNumeric();
      const original = v.messageTemplate.INVALID;
      v.setMessage('test', null);
      expect(v.messageTemplate.INVALID).toBe(original);
    });
  });

  describe('getClass', () => {
    it('should return the constructor name', () => {
      const v = new AlphaNumeric();
      expect(v.getClass()).toBe('AlphaNumeric');
    });
  });

});
