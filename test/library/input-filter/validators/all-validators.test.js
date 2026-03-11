const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const Uuid = require(path.join(projectRoot, 'library/input-filter/validators/uuid'));
const Identical = require(path.join(projectRoot, 'library/input-filter/validators/identical'));
const Ip = require(path.join(projectRoot, 'library/input-filter/validators/ip'));

// ─── UUID Validator ───────────────────────────────────────────────────────────

describe('Uuid Validator', () => {

  describe('constructor', () => {
    it('should use default name "input" when no options given', () => {
      const v = new Uuid();
      expect(v.name).toBe('input');
    });

    it('should accept a custom name', () => {
      const v = new Uuid({ name: 'userId' });
      expect(v.name).toBe('userId');
    });

    it('should have default messageTemplate', () => {
      const v = new Uuid();
      expect(v.messageTemplate.INVALID).toContain('invalid');
      expect(v.messageTemplate.INVALID_FORMAT).toContain('UUID');
    });

    it('should accept custom messageTemplate', () => {
      const v = new Uuid({ messageTemplate: { INVALID: 'bad type', INVALID_FORMAT: 'bad uuid' } });
      expect(v.messageTemplate.INVALID).toBe('bad type');
      expect(v.messageTemplate.INVALID_FORMAT).toBe('bad uuid');
    });

    it('should initialize message to null', () => {
      const v = new Uuid();
      expect(v.message).toBeNull();
    });
  });

  describe('isValid', () => {
    let validator;
    beforeEach(() => {
      validator = new Uuid();
    });

    it('should return true for a valid UUID v4', () => {
      expect(validator.isValid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should return true for uppercase UUID', () => {
      expect(validator.isValid('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
    });

    it('should return true for mixed case UUID', () => {
      expect(validator.isValid('550e8400-E29B-41d4-A716-446655440000')).toBe(true);
    });

    it('should return false for non-string value and set INVALID message', () => {
      expect(validator.isValid(12345)).toBe(false);
      expect(validator.message).toBe(validator.messageTemplate.INVALID);
    });

    it('should return false for null', () => {
      expect(validator.isValid(null)).toBe(false);
      expect(validator.message).toBe(validator.messageTemplate.INVALID);
    });

    it('should return false for undefined', () => {
      expect(validator.isValid(undefined)).toBe(false);
    });

    it('should return false for an object', () => {
      expect(validator.isValid({})).toBe(false);
    });

    it('should return false for invalid UUID format', () => {
      expect(validator.isValid('not-a-uuid')).toBe(false);
      expect(validator.message).toBe(validator.messageTemplate.INVALID_FORMAT);
    });

    it('should return false for UUID missing a section', () => {
      expect(validator.isValid('550e8400-e29b-41d4-a716')).toBe(false);
    });

    it('should return false for UUID with invalid characters', () => {
      expect(validator.isValid('550e8400-e29b-41d4-a716-44665544ZZZZ')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(validator.isValid('')).toBe(false);
    });

    it('should return false for UUID without dashes', () => {
      expect(validator.isValid('550e8400e29b41d4a716446655440000')).toBe(false);
    });
  });
});

// ─── Identical Validator ──────────────────────────────────────────────────────

describe('Identical Validator', () => {

  describe('constructor', () => {
    it('should use default name "input"', () => {
      const v = new Identical();
      expect(v.name).toBe('input');
    });

    it('should accept custom name', () => {
      const v = new Identical({ name: 'password' });
      expect(v.name).toBe('password');
    });

    it('should store token from options', () => {
      const v = new Identical({ token: 'password' });
      expect(v.token).toBe('password');
    });

    it('should have default messageTemplate', () => {
      const v = new Identical();
      expect(v.messageTemplate.NOT_SAME).toBeDefined();
      expect(v.messageTemplate.MISSING_TOKEN).toBeDefined();
      expect(v.messageTemplate.INVALID_TOKEN).toBeDefined();
    });

    it('should initialize message to null', () => {
      const v = new Identical();
      expect(v.message).toBeNull();
    });
  });

  describe('getToken / setToken', () => {
    it('should return the token', () => {
      const v = new Identical({ token: 'email' });
      expect(v.getToken()).toBe('email');
    });

    it('should update the token', () => {
      const v = new Identical();
      v.setToken('confirm_password');
      expect(v.getToken()).toBe('confirm_password');
    });
  });

  describe('isValid', () => {
    it('should return false with MISSING_TOKEN when token is null', () => {
      const v = new Identical();
      expect(v.isValid('value', {})).toBe(false);
      expect(v.message).toBe(v.messageTemplate.MISSING_TOKEN);
    });

    it('should return false with MISSING_TOKEN when token is undefined', () => {
      const v = new Identical({ token: undefined });
      expect(v.isValid('value', {})).toBe(false);
      expect(v.message).toBe(v.messageTemplate.MISSING_TOKEN);
    });

    it('should return false with INVALID_TOKEN when token key not in context', () => {
      const v = new Identical({ token: 'password' });
      expect(v.isValid('value', { email: 'test' })).toBe(false);
      expect(v.message).toBe(v.messageTemplate.INVALID_TOKEN);
    });

    it('should return false with NOT_SAME when values do not match', () => {
      const v = new Identical({ token: 'password' });
      expect(v.isValid('abc', { password: 'xyz' })).toBe(false);
      expect(v.message).toBe(v.messageTemplate.NOT_SAME);
    });

    it('should return true when values match', () => {
      const v = new Identical({ token: 'password' });
      expect(v.isValid('secret123', { password: 'secret123' })).toBe(true);
    });

    it('should use loose equality (==) for comparison', () => {
      const v = new Identical({ token: 'count' });
      // 0 == '' is true in JS loose equality
      expect(v.isValid(0, { count: '' })).toBe(true);
    });
  });
});

// ─── Ip Validator ─────────────────────────────────────────────────────────────

describe('Ip Validator', () => {

  describe('constructor', () => {
    it('should use default name "input"', () => {
      const v = new Ip();
      expect(v.name).toBe('input');
    });

    it('should default to allow IPv4 only', () => {
      const v = new Ip();
      expect(v.allowip4).toBe(true);
      expect(v.allowip6).toBe(false);
    });

    it('should initialize message to null', () => {
      const v = new Ip();
      expect(v.message).toBeNull();
    });

    it('should have messageTemplate', () => {
      const v = new Ip();
      expect(v.messageTemplate.INVALID).toBeDefined();
      expect(v.messageTemplate.NOT_IP_ADDRESS).toBeDefined();
    });
  });

  describe('isValid - type check', () => {
    it('should return false for non-string with INVALID message', () => {
      const v = new Ip();
      expect(v.isValid(12345)).toBe(false);
      expect(v.message).toBe(v.messageTemplate.INVALID);
    });

    it('should return false for null', () => {
      const v = new Ip();
      expect(v.isValid(null)).toBe(false);
    });

    it('should return false for object', () => {
      const v = new Ip();
      expect(v.isValid({})).toBe(false);
    });
  });

  describe('isValid - IPv4', () => {
    let validator;
    beforeEach(() => {
      validator = new Ip();
    });

    it('should return true for valid IPv4 address', () => {
      expect(validator.isValid('192.168.1.1')).toBe(true);
    });

    it('should return true for 0.0.0.0', () => {
      expect(validator.isValid('0.0.0.0')).toBe(true);
    });

    it('should return true for 255.255.255.255', () => {
      expect(validator.isValid('255.255.255.255')).toBe(true);
    });

    it('should return true for 127.0.0.1', () => {
      expect(validator.isValid('127.0.0.1')).toBe(true);
    });

    it('should return false for octet >= 256', () => {
      expect(validator.isValid('256.0.0.1')).toBe(false);
    });

    it('should return false for leading zeros', () => {
      expect(validator.isValid('192.168.01.1')).toBe(false);
    });

    it('should return false for too few octets', () => {
      expect(validator.isValid('192.168.1')).toBe(false);
    });

    it('should return false for too many octets', () => {
      expect(validator.isValid('192.168.1.1.1')).toBe(false);
    });

    it('should return false for non-numeric IP', () => {
      expect(validator.isValid('abc.def.ghi.jkl')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(validator.isValid('')).toBe(false);
    });

    it('should set NOT_IP_ADDRESS message for invalid IP', () => {
      validator.isValid('999.999.999.999');
      expect(validator.message).toBe(validator.messageTemplate.NOT_IP_ADDRESS);
    });
  });

  describe('isValid - IPv6', () => {
    it('should reject IPv6 when allowip6 is false (default)', () => {
      const v = new Ip();
      expect(v.isValid('::1')).toBe(false);
    });

    it('should accept valid IPv6 when allowip6 is true', () => {
      const v = new Ip({ allowip6: true });
      expect(v.isValid('::1')).toBe(true);
    });

    it('should accept full IPv6 address when enabled', () => {
      const v = new Ip({ allowip6: true });
      expect(v.isValid('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    });

    it('should reject invalid IPv6 when enabled', () => {
      const v = new Ip({ allowip6: true });
      expect(v.isValid('not-an-ipv6')).toBe(false);
    });
  });

  describe('validateIp4 direct calls', () => {
    it('should return false for negative-like octets', () => {
      const v = new Ip();
      // The regex only matches digits, so negative isn't possible via regex,
      // but parseInt of valid digits that exceed 255 should fail
      expect(v.validateIp4('300.0.0.1')).toBe(false);
    });

    it('should return true for valid IP', () => {
      const v = new Ip();
      expect(v.validateIp4('10.0.0.1')).toBe(true);
    });
  });
});
