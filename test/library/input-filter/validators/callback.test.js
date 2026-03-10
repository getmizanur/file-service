const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const Callback = require(path.join(projectRoot, 'library/input-filter/validators/callback'));

describe('Callback Validator', () => {

  describe('constructor', () => {
    it('should create with a valid callback function', () => {
      const validator = new Callback({ callback: () => true });
      expect(validator).toBeInstanceOf(Callback);
    });

    it('should throw TypeError when no options provided', () => {
      expect(() => new Callback()).toThrow(TypeError);
    });

    it('should throw TypeError when callback is missing', () => {
      expect(() => new Callback({})).toThrow(
        'Callback validator requires a valid callback function'
      );
    });

    it('should throw TypeError when callback is not a function', () => {
      expect(() => new Callback({ callback: 'string' })).toThrow(TypeError);
    });

    it('should throw TypeError for null callback', () => {
      expect(() => new Callback({ callback: null })).toThrow(TypeError);
    });

    it('should set default message templates', () => {
      const v = new Callback({ callback: () => true });
      expect(v.messageTemplates.INVALID).toBe('The input value is invalid');
      expect(v.messageTemplates.CALLBACK_ERROR).toBe('An error occurred during validation');
    });

    it('should accept custom messageTemplate', () => {
      const v = new Callback({
        callback: () => true,
        messageTemplate: { INVALID: 'Custom invalid' },
      });
      expect(v.messageTemplates.INVALID).toBe('Custom invalid');
    });

    it('should merge messageTemplates option', () => {
      const v = new Callback({
        callback: () => true,
        messageTemplates: { CUSTOM_KEY: 'Custom message' },
      });
      expect(v.messageTemplates.CUSTOM_KEY).toBe('Custom message');
      expect(v.messageTemplates.INVALID).toBe('The input value is invalid');
    });

    it('should initialize messages to null', () => {
      const v = new Callback({ callback: () => true });
      expect(v.messages).toBeNull();
    });
  });

  describe('isValid() - boolean return', () => {
    it('should return true when callback returns true', () => {
      const v = new Callback({ callback: () => true });
      expect(v.isValid('test')).toBe(true);
    });

    it('should return false when callback returns false', () => {
      const v = new Callback({ callback: () => false });
      expect(v.isValid('test')).toBe(false);
    });

    it('should populate INVALID message on false return', () => {
      const v = new Callback({ callback: () => false });
      v.isValid('test');
      expect(v.getMessages()).toContain('The input value is invalid');
    });

    it('should pass value to callback', () => {
      const spy = jest.fn().mockReturnValue(true);
      const v = new Callback({ callback: spy });
      v.isValid('hello');
      expect(spy).toHaveBeenCalledWith('hello', {}, v);
    });
  });

  describe('isValid() - object return', () => {
    it('should return false when result.valid is false', () => {
      const v = new Callback({
        callback: () => ({ valid: false }),
      });
      expect(v.isValid('test')).toBe(false);
    });

    it('should use result.key for error lookup', () => {
      const v = new Callback({
        callback: () => ({ valid: false, key: 'INVALID' }),
      });
      v.isValid('test');
      expect(v.getMessages()).toContain('The input value is invalid');
    });

    it('should support result.keys array for multiple errors', () => {
      const v = new Callback({
        callback: () => ({ valid: false, keys: ['INVALID', 'CALLBACK_ERROR'] }),
        messageTemplates: {
          INVALID: 'Invalid!',
          CALLBACK_ERROR: 'Error!',
        },
      });
      v.isValid('test');
      const messages = v.getMessages();
      expect(messages).toContain('Invalid!');
      expect(messages).toContain('Error!');
    });

    it('should default to INVALID when no key or keys in result', () => {
      const v = new Callback({
        callback: () => ({ valid: false }),
      });
      v.isValid('test');
      expect(v.getMessages()).toContain('The input value is invalid');
    });

    it('should return true when result.valid is true', () => {
      const v = new Callback({
        callback: () => ({ valid: true }),
      });
      expect(v.isValid('test')).toBe(true);
    });

    it('should return true for non-null object without valid property', () => {
      const v = new Callback({
        callback: () => ({ someData: 'yes' }),
      });
      expect(v.isValid('test')).toBe(true);
    });
  });

  describe('isValid() - callback throws exception', () => {
    it('should return false when callback throws', () => {
      const v = new Callback({
        callback: () => { throw new Error('boom'); },
      });
      expect(v.isValid('test')).toBe(false);
    });

    it('should populate CALLBACK_ERROR message', () => {
      const v = new Callback({
        callback: () => { throw new Error('boom'); },
      });
      v.isValid('test');
      expect(v.getMessages()).toContain('An error occurred during validation');
    });
  });

  describe('isValid() - context', () => {
    it('should pass context to callback', () => {
      const v = new Callback({
        callback: (value, context) => value === context.confirm,
      });
      expect(v.isValid('abc', { confirm: 'abc' })).toBe(true);
      expect(v.isValid('abc', { confirm: 'xyz' })).toBe(false);
    });

    it('should default context to empty object', () => {
      const v = new Callback({
        callback: (value, context) => {
          return typeof context === 'object' && context !== null;
        },
      });
      expect(v.isValid('test')).toBe(true);
    });

    it('should pass validator instance as third argument', () => {
      let receivedValidator;
      const v = new Callback({
        callback: (value, context, validatorInstance) => {
          receivedValidator = validatorInstance;
          return true;
        },
      });
      v.isValid('test');
      expect(receivedValidator).toBe(v);
    });
  });

  describe('isValid() - truthy/falsy', () => {
    it('should treat truthy non-boolean return as valid', () => {
      const v = new Callback({ callback: () => 1 });
      expect(v.isValid('test')).toBe(true);
    });

    it('should treat 0 as valid (not strictly false)', () => {
      const v = new Callback({ callback: () => 0 });
      expect(v.isValid('test')).toBe(true);
    });

    it('should treat null as valid (not strictly false)', () => {
      const v = new Callback({ callback: () => null });
      expect(v.isValid('test')).toBe(true);
    });

    it('should treat undefined as valid (not strictly false)', () => {
      const v = new Callback({ callback: () => undefined });
      expect(v.isValid('test')).toBe(true);
    });
  });

  describe('isValid() - message reset', () => {
    it('should reset messages on each call', () => {
      const v = new Callback({ callback: (val) => val.length > 3 });
      v.isValid('hi');
      expect(v.getMessages().length).toBeGreaterThan(0);
      v.isValid('hello');
      expect(v.getMessages().length).toBe(0);
    });
  });

  describe('getMessages()', () => {
    it('should return array of message values', () => {
      const v = new Callback({ callback: () => false });
      v.isValid('test');
      expect(Array.isArray(v.getMessages())).toBe(true);
    });

    it('should return empty array when valid', () => {
      const v = new Callback({ callback: () => true });
      v.isValid('test');
      expect(v.getMessages()).toEqual([]);
    });
  });

  describe('setMessage()', () => {
    it('should update message template for known key', () => {
      const v = new Callback({ callback: () => false });
      v.setMessage('Custom invalid', 'INVALID');
      v.isValid('test');
      expect(v.getMessages()).toContain('Custom invalid');
    });

    it('should set messages directly when no key or unknown key', () => {
      const v = new Callback({ callback: () => true });
      v.isValid('test'); // initialize messages
      v.setMessage('direct message');
      expect(v.messages).toBe('direct message');
    });
  });

  describe('setMessageTemplates()', () => {
    it('should merge templates', () => {
      const v = new Callback({ callback: () => true });
      v.setMessageTemplates({ NEW_KEY: 'New message' });
      expect(v.messageTemplates.NEW_KEY).toBe('New message');
      expect(v.messageTemplates.INVALID).toBe('The input value is invalid');
    });

    it('should be chainable', () => {
      const v = new Callback({ callback: () => true });
      expect(v.setMessageTemplates({})).toBe(v);
    });
  });

  describe('error()', () => {
    it('should use INVALID template by default', () => {
      const v = new Callback({ callback: () => true });
      v.isValid('test'); // init messages
      v.error();
      expect(v.messages.INVALID).toBe('The input value is invalid');
    });

    it('should fall back to INVALID for unknown key', () => {
      const v = new Callback({ callback: () => true });
      v.isValid('test'); // init messages
      v.error('UNKNOWN_KEY');
      expect(v.messages.UNKNOWN_KEY).toBe('The input value is invalid');
    });
  });

  describe('getClass()', () => {
    it('should return "Callback"', () => {
      const v = new Callback({ callback: () => true });
      expect(v.getClass()).toBe('Callback');
    });
  });
});
