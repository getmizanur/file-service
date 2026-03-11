const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../..');

global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const Csrf = require(path.join(projectRoot, 'library/form/element/csrf'));

describe('Csrf', () => {
  // --- Constructor ---
  describe('constructor', () => {
    it('should default name to "csrf"', () => {
      const csrf = new Csrf();
      expect(csrf.getName()).toBe('csrf');
    });

    it('should set type to hidden', () => {
      const csrf = new Csrf();
      expect(csrf.getAttribute('type')).toBe('hidden');
    });

    it('should set autocomplete to off', () => {
      const csrf = new Csrf();
      expect(csrf.getAttribute('autocomplete')).toBe('off');
    });

    it('should generate a token by default', () => {
      const csrf = new Csrf();
      expect(csrf.getToken()).toBeTruthy();
      expect(csrf.getToken()).toHaveLength(64); // 32 bytes * 2 hex chars
    });

    it('should accept a custom name', () => {
      const csrf = new Csrf('my_token');
      expect(csrf.getName()).toBe('my_token');
    });

    it('should accept a provided valid token', () => {
      const token = 'a'.repeat(64);
      const csrf = new Csrf('csrf', { token });
      expect(csrf.getToken()).toBe(token);
    });

    it('should reject invalid provided token and generate new one', () => {
      const csrf = new Csrf('csrf', { token: 'too-short' });
      expect(csrf.getToken()).not.toBe('too-short');
      expect(csrf.getToken()).toHaveLength(64);
    });

    it('should accept custom tokenLength', () => {
      const csrf = new Csrf('csrf', { tokenLength: 16 });
      expect(csrf.getToken()).toHaveLength(32); // 16 bytes * 2
    });

    it('should use default tokenLength when non-integer', () => {
      const csrf = new Csrf('csrf', { tokenLength: 'abc' });
      expect(csrf.getToken()).toHaveLength(64);
    });

    it('should set value to the token', () => {
      const csrf = new Csrf();
      expect(csrf.getValue()).toBe(csrf.getToken());
    });

    it('should reject null token and generate new one', () => {
      const csrf = new Csrf('csrf', { token: null });
      expect(csrf.getToken()).toHaveLength(64);
    });
  });

  // --- generateToken ---
  describe('generateToken', () => {
    it('should generate hex string of correct length', () => {
      const csrf = new Csrf();
      const token = csrf.generateToken();
      expect(token).toMatch(/^[0-9a-f]+$/);
      expect(token).toHaveLength(64);
    });
  });

  // --- validate (lines 38-58) ---
  describe('validate', () => {
    it('should validate correct token', () => {
      const csrf = new Csrf();
      const token = csrf.getToken();
      expect(csrf.validate(token)).toBe(true);
    });

    it('should reject wrong token', () => {
      const csrf = new Csrf();
      const wrong = 'b'.repeat(64);
      // Unlikely to match random token
      expect(csrf.validate(wrong)).toBe(false);
    });

    it('should reject empty/null/undefined submitted token', () => {
      const csrf = new Csrf();
      expect(csrf.validate(null)).toBe(false);
      expect(csrf.validate(undefined)).toBe(false);
      expect(csrf.validate('')).toBe(false);
    });

    it('should reject token with wrong length', () => {
      const csrf = new Csrf();
      expect(csrf.validate('abcdef')).toBe(false);
    });

    it('should reject non-hex token of correct length', () => {
      const csrf = new Csrf();
      const badToken = 'z'.repeat(64);
      expect(csrf.validate(badToken)).toBe(false);
    });

    it('should convert submitted token to string', () => {
      const csrf = new Csrf();
      // Number will be converted to string, won't match format
      expect(csrf.validate(12345)).toBe(false);
    });

    it('should return false when timingSafeEqual throws (line 56)', () => {
      const csrf = new Csrf();
      const token = csrf.getToken();
      // Monkey-patch Buffer.from to throw for the timingSafeEqual call
      const originalFrom = Buffer.from;
      let callCount = 0;
      Buffer.from = function(...args) {
        callCount++;
        if (callCount >= 2) {
          throw new Error('forced buffer error');
        }
        return originalFrom.apply(this, args);
      };
      expect(csrf.validate(token)).toBe(false);
      Buffer.from = originalFrom;
    });
  });

  // --- _isValidTokenFormat (lines 64-72) ---
  describe('_isValidTokenFormat', () => {
    it('should accept valid hex token', () => {
      const csrf = new Csrf();
      const valid = 'a1b2c3d4'.repeat(8);
      expect(csrf._isValidTokenFormat(valid)).toBe(true);
    });

    it('should reject non-string', () => {
      const csrf = new Csrf();
      expect(csrf._isValidTokenFormat(null)).toBe(false);
      expect(csrf._isValidTokenFormat(123)).toBe(false);
      expect(csrf._isValidTokenFormat(undefined)).toBe(false);
    });

    it('should reject wrong length', () => {
      const csrf = new Csrf();
      expect(csrf._isValidTokenFormat('abcd')).toBe(false);
    });

    it('should reject non-hex characters', () => {
      const csrf = new Csrf();
      const bad = 'g'.repeat(64);
      expect(csrf._isValidTokenFormat(bad)).toBe(false);
    });

    it('should accept uppercase hex', () => {
      const csrf = new Csrf();
      const upper = 'A1B2C3D4'.repeat(8);
      expect(csrf._isValidTokenFormat(upper)).toBe(true);
    });
  });

  // Branch: length mismatch returns false before timingSafeEqual (line 45)
  describe('validate length mismatch', () => {
    it('should return false when submitted token has different length (line 45)', () => {
      const csrf = new Csrf();
      const token = csrf.getToken();
      // Valid hex format but different length
      const shorter = token.slice(0, -2);
      expect(csrf.validate(shorter)).toBe(false);
    });

    it('should return false at line 45 when _isValidTokenFormat passes but lengths differ (monkey-patch)', () => {
      const csrf = new Csrf();
      // Monkey-patch _isValidTokenFormat to always return true
      const original = csrf._isValidTokenFormat.bind(csrf);
      csrf._isValidTokenFormat = () => true;
      // Submit a token with different length than csrf.token (64 chars)
      const differentLength = 'ab'.repeat(30); // 60 chars, not 64
      const result = csrf.validate(differentLength);
      expect(result).toBe(false);
      csrf._isValidTokenFormat = original;
    });
  });
});
