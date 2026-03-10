const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const EmailAddress = require(path.join(projectRoot, 'library/input-filter/validators/email-address'));

describe('EmailAddress Validator', () => {

  let validator;

  beforeEach(() => {
    validator = new EmailAddress();
  });

  describe('constructor', () => {
    it('should set default name to "input"', () => {
      expect(validator.name).toBe('input');
    });

    it('should accept custom name', () => {
      const v = new EmailAddress({ name: 'email' });
      expect(v.name).toBe('email');
    });

    it('should initialize message to null', () => {
      expect(validator.message).toBeNull();
    });

    it('should set default message templates', () => {
      expect(validator.messageTemplate.INVALID).toBeDefined();
      expect(validator.messageTemplate.INVALID_FORMAT).toBeDefined();
    });
  });

  describe('isValid()', () => {
    it('should return true for a valid email', () => {
      expect(validator.isValid('user@example.com')).toBe(true);
    });

    it('should return true for email with subdomain', () => {
      expect(validator.isValid('user@mail.example.com')).toBe(true);
    });

    it('should return false for non-string input', () => {
      expect(validator.isValid(123)).toBe(false);
      expect(validator.message).toBe(validator.messageTemplate.INVALID);
    });

    it('should return false for null input', () => {
      expect(validator.isValid(null)).toBe(false);
    });

    it('should return false for email without @', () => {
      expect(validator.isValid('userexample.com')).toBe(false);
      expect(validator.message).toBe(validator.messageTemplate.INVALID_FORMAT);
    });

    it('should return false for email with multiple @', () => {
      expect(validator.isValid('user@@example.com')).toBe(false);
    });

    it('should return false when local part exceeds 64 characters', () => {
      const longLocal = 'a'.repeat(65) + '@example.com';
      expect(validator.isValid(longLocal)).toBe(false);
      expect(validator.message).toBe(validator.messageTemplate.INVALID_FORMAT);
    });

    it('should return false when domain exceeds 255 characters', () => {
      const longDomain = 'user@' + 'a'.repeat(252) + '.com';
      expect(validator.isValid(longDomain)).toBe(false);
      expect(validator.message).toBe(validator.messageTemplate.INVALID_FORMAT);
    });

    it('should return false when domain label exceeds 63 characters', () => {
      const longLabel = 'user@' + 'a'.repeat(64) + '.com';
      expect(validator.isValid(longLabel)).toBe(false);
      expect(validator.message).toBe(validator.messageTemplate.INVALID_FORMAT);
    });

    it('should return false for invalid format', () => {
      expect(validator.isValid('user@')).toBe(false);
    });

    it('should accept valid special chars in local part', () => {
      expect(validator.isValid("user+tag@example.com")).toBe(true);
    });
  });

  describe('setMessage()', () => {
    it('should set custom message for a specific key', () => {
      validator.setMessage('Bad email!', 'INVALID_FORMAT');
      expect(validator.messageTemplate.INVALID_FORMAT).toBe('Bad email!');
    });

    it('should default to INVALID_FORMAT key', () => {
      validator.setMessage('Custom error');
      expect(validator.messageTemplate.INVALID_FORMAT).toBe('Custom error');
    });

    it('should be chainable', () => {
      expect(validator.setMessage('msg', 'INVALID')).toBe(validator);
    });

    it('should use custom message during validation', () => {
      validator.setMessage('Email is wrong', 'INVALID_FORMAT');
      validator.isValid('bad');
      expect(validator.message).toBe('Email is wrong');
    });
  });

  describe('getClass()', () => {
    it('should return "EmailAddress"', () => {
      expect(validator.getClass()).toBe('EmailAddress');
    });
  });
});
