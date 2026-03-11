const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const Callback = require(path.join(projectRoot, 'library/input-filter/validators/callback'));

describe('Callback Validator', () => {

  it('should throw if no callback provided', () => {
    expect(() => new Callback({})).toThrow('Callback validator requires a valid callback function');
  });

  it('should throw if callback is not a function', () => {
    expect(() => new Callback({ callback: 'not a function' })).toThrow();
  });

  describe('constructor options', () => {
    it('should store the callback function', () => {
      const fn = (v) => v.length > 5;
      const v = new Callback({ callback: fn });
      expect(v.callback).toBe(fn);
    });

    it('should use default messageTemplates', () => {
      const v = new Callback({ callback: () => true });
      expect(v.messageTemplates.INVALID).toBe('The input value is invalid');
      expect(v.messageTemplates.CALLBACK_ERROR).toBe('An error occurred during validation');
    });

    it('should accept custom messageTemplate option', () => {
      const v = new Callback({
        callback: () => true,
        messageTemplate: { INVALID: 'Custom invalid' }
      });
      expect(v.messageTemplates.INVALID).toBe('Custom invalid');
    });

    it('should apply messageTemplates option via setMessageTemplates (line 59-61)', () => {
      const v = new Callback({
        callback: () => true,
        messageTemplates: { CUSTOM_KEY: 'Custom value' }
      });
      expect(v.messageTemplates.CUSTOM_KEY).toBe('Custom value');
      expect(v.messageTemplates.INVALID).toBe('The input value is invalid');
    });

    it('should initialize messages to null', () => {
      const v = new Callback({ callback: () => true });
      expect(v.messages).toBeNull();
    });
  });

  describe('setMessageTemplates (lines 66-73)', () => {
    it('should merge new templates with existing ones', () => {
      const v = new Callback({ callback: () => true });
      const result = v.setMessageTemplates({ NEW_KEY: 'New message' });
      expect(v.messageTemplates.NEW_KEY).toBe('New message');
      expect(v.messageTemplates.INVALID).toBe('The input value is invalid');
      expect(result).toBe(v); // chaining
    });
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
  });

  describe('object return with key (line 105)', () => {
    it('should call error with result.key when provided', () => {
      const v = new Callback({
        callback: () => ({ valid: false, key: 'CALLBACK_ERROR' })
      });
      expect(v.isValid('test')).toBe(false);
      expect(v.getMessages()).toContain('An error occurred during validation');
    });
  });

  describe('object return with keys array (line 106-108)', () => {
    it('should call error for each key in result.keys', () => {
      const v = new Callback({
        callback: () => ({ valid: false, keys: ['INVALID', 'CALLBACK_ERROR'] })
      });
      expect(v.isValid('test')).toBe(false);
      const msgs = v.getMessages();
      expect(msgs).toContain('The input value is invalid');
      expect(msgs).toContain('An error occurred during validation');
    });
  });

  describe('object return with valid=true', () => {
    it('should return true for object with valid=true', () => {
      const v = new Callback({
        callback: () => ({ valid: true })
      });
      expect(v.isValid('test')).toBe(true);
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
      expect(validator.getMessages()).toContain('An error occurred during validation');
    });
  });

  describe('truthy/falsy coercion', () => {
    it('should treat truthy return as valid', () => {
      const v = new Callback({ callback: (value) => value.length });
      expect(v.isValid('hello')).toBe(true);
    });

    it('should treat falsy 0 as valid (not strictly false)', () => {
      const v = new Callback({ callback: (value) => value.length });
      expect(v.isValid('')).toBe(true);
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

  describe('setMessage (lines 137-143)', () => {
    it('should update existing template key', () => {
      const v = new Callback({ callback: () => true });
      v.isValid('x'); // init messages to {}
      v.setMessage('Updated invalid', 'INVALID');
      expect(v.messageTemplates.INVALID).toBe('Updated invalid');
    });

    it('should set messages directly when key is not in templates', () => {
      const v = new Callback({ callback: () => true });
      v.isValid('x'); // init messages to {}
      v.setMessage('Direct message', 'UNKNOWN_KEY');
      expect(v.messages).toBe('Direct message');
    });

    it('should set messages directly when key is falsy', () => {
      const v = new Callback({ callback: () => true });
      v.isValid('x');
      v.setMessage('Direct message');
      expect(v.messages).toBe('Direct message');
    });
  });

  describe('getClass (lines 149-151)', () => {
    it('should return "Callback"', () => {
      const v = new Callback({ callback: () => true });
      expect(v.getClass()).toBe('Callback');
    });
  });

  describe('error method (lines 75-80)', () => {
    it('should use INVALID template when key not found in templates', () => {
      const v = new Callback({ callback: () => false });
      v.isValid('x');
      expect(v.getMessages()).toContain('The input value is invalid');
    });

    it('should use specific template key when it exists (line 75-77)', () => {
      const v = new Callback({
        callback: (value) => {
          // Return object with specific error key
          return { valid: false, key: 'CUSTOM_ERROR' };
        },
        messageTemplate: {
          INVALID: 'Default invalid',
          CUSTOM_ERROR: 'Custom error message'
        }
      });
      v.isValid('x');
      expect(v.getMessages()).toContain('Custom error message');
    });
  });

  // Branch: constructor without callback option (line 42)
  describe('constructor validation (line 42)', () => {
    it('should throw when options.callback is not a function', () => {
      expect(() => new Callback({ callback: 'not-a-function' })).toThrow(TypeError);
    });

    it('should throw when options is empty (no callback)', () => {
      expect(() => new Callback({})).toThrow(TypeError);
    });

    // Default parameter branch: call constructor with NO arguments (options defaults to {})
    it('should throw when called with no arguments using default options={} (line 42 default branch)', () => {
      expect(() => new Callback()).toThrow(TypeError);
    });
  });

  // Branch: error() method default parameter and || fallback (lines 75-77)
  describe('error method branches (lines 75-77)', () => {
    // Line 75: error(key = 'INVALID') - call without argument to use default key
    it('should use default key "INVALID" when error() called without argument (line 75 default branch)', () => {
      const v = new Callback({ callback: () => false });
      v.isValid('x'); // init messages to {}
      v.error(); // call without key - uses default 'INVALID'
      expect(v.messages['INVALID']).toBe('The input value is invalid');
    });

    // Line 76: || this.messageTemplates.INVALID - when messageTemplates[key] is falsy
    it('should fall back to INVALID template when key not in messageTemplates (line 76 false branch)', () => {
      const v = new Callback({ callback: () => false });
      v.isValid('x'); // init messages to {}
      // Call error with a key that doesn't exist in messageTemplates
      v.error('NONEXISTENT_KEY');
      expect(v.messages['NONEXISTENT_KEY']).toBe('The input value is invalid');
    });
  });
});
