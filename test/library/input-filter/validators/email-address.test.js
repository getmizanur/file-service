const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
const EmailAddress = require(path.join(projectRoot, 'library/input-filter/validators/email-address'));

describe('EmailAddress', () => {

  describe('constructor', () => {
    it('should use default name and messageTemplate', () => {
      const v = new EmailAddress();
      expect(v.name).toBe('input');
      expect(v.email).toBeNull();
      expect(v.message).toBeNull();
      expect(v.messageTemplate.INVALID).toBeDefined();
      expect(v.messageTemplate.INVALID_FORMAT).toBeDefined();
    });

    it('should accept custom name', () => {
      const v = new EmailAddress({ name: 'email' });
      expect(v.name).toBe('email');
    });
  });

  describe('isValid', () => {
    it('should return false for non-string values', () => {
      const v = new EmailAddress();
      expect(v.isValid(123)).toBe(false);
      expect(v.message).toBe(v.messageTemplate.INVALID);
    });

    it('should return false for null', () => {
      const v = new EmailAddress();
      expect(v.isValid(null)).toBe(false);
      expect(v.message).toBe(v.messageTemplate.INVALID);
    });

    it('should return true for a valid email', () => {
      const v = new EmailAddress();
      expect(v.isValid('user@example.com')).toBe(true);
      expect(v.message).toBe('Valid email address');
    });

    it('should return false for email without @', () => {
      const v = new EmailAddress();
      expect(v.isValid('userexample.com')).toBe(false);
      expect(v.message).toBe(v.messageTemplate.INVALID_FORMAT);
    });

    it('should return false for email with multiple @', () => {
      const v = new EmailAddress();
      expect(v.isValid('user@@example.com')).toBe(false);
      expect(v.message).toBe(v.messageTemplate.INVALID_FORMAT);
    });

    it('should return false when account part exceeds 64 characters', () => {
      const v = new EmailAddress();
      const longAccount = 'a'.repeat(65);
      expect(v.isValid(`${longAccount}@example.com`)).toBe(false);
      expect(v.message).toBe(v.messageTemplate.INVALID_FORMAT);
    });

    it('should return false when domain exceeds 255 characters', () => {
      const v = new EmailAddress();
      const longDomain = 'a'.repeat(256) + '.com';
      expect(v.isValid(`user@${longDomain}`)).toBe(false);
      expect(v.message).toBe(v.messageTemplate.INVALID_FORMAT);
    });

    it('should return false when a domain part exceeds 63 characters', () => {
      const v = new EmailAddress();
      const longPart = 'a'.repeat(64);
      expect(v.isValid(`user@${longPart}.com`)).toBe(false);
      expect(v.message).toBe(v.messageTemplate.INVALID_FORMAT);
    });

    it('should return false for invalid email format', () => {
      const v = new EmailAddress();
      expect(v.isValid('user@.com')).toBe(false);
      expect(v.message).toBe(v.messageTemplate.INVALID_FORMAT);
    });

    it('should return false for email ending with dot in domain', () => {
      const v = new EmailAddress();
      expect(v.isValid('user@example.')).toBe(false);
    });
  });

  describe('setMessage', () => {
    it('should set message for the default key (INVALID_FORMAT)', () => {
      const v = new EmailAddress();
      const result = v.setMessage('Custom message');
      expect(v.messageTemplate.INVALID_FORMAT).toBe('Custom message');
      expect(result).toBe(v);
    });

    it('should set message for a specific key', () => {
      const v = new EmailAddress();
      v.setMessage('Custom invalid', 'INVALID');
      expect(v.messageTemplate.INVALID).toBe('Custom invalid');
    });
  });

  describe('getClass', () => {
    it('should return the constructor name', () => {
      const v = new EmailAddress();
      expect(v.getClass()).toBe('EmailAddress');
    });
  });

});
