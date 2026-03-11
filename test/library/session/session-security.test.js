const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
const SessionSecurity = require(path.join(projectRoot, 'library/session/session-security'));

describe('SessionSecurity', () => {
  const secret = 'test-secret-key-123';

  beforeAll(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterAll(() => {
    console.warn.mockRestore();
  });

  describe('constructor', () => {
    it('should create with explicit secret', () => {
      const ss = new SessionSecurity({ secret });
      expect(ss).toBeDefined();
      expect(ss.secret).toBe(secret);
    });

    it('should throw when no secret and not allowing insecure', () => {
      const orig = process.env.SESSION_SECURITY_SECRET;
      delete process.env.SESSION_SECURITY_SECRET;
      expect(() => new SessionSecurity()).toThrow('SESSION_SECURITY_SECRET is not set');
      process.env.SESSION_SECURITY_SECRET = orig;
    });

    it('should use insecure default when allowed', () => {
      const orig = process.env.SESSION_SECURITY_SECRET;
      delete process.env.SESSION_SECURITY_SECRET;
      const ss = new SessionSecurity({ allowInsecureDefaultSecret: true });
      expect(ss.secret).toBe('dev-secret-change-me');
      process.env.SESSION_SECURITY_SECRET = orig;
    });

    it('should clamp signatureLength to min 8', () => {
      const ss = new SessionSecurity({ secret, signatureLength: 2 });
      expect(ss.signatureLength).toBe(8);
    });

    it('should clamp signatureLength to max 64', () => {
      const ss = new SessionSecurity({ secret, signatureLength: 100 });
      expect(ss.signatureLength).toBe(64);
    });
  });

  describe('isValidSessionIdFormat', () => {
    it('should accept 20+ char alphanumeric IDs', () => {
      const ss = new SessionSecurity({ secret });
      expect(ss.isValidSessionIdFormat('abcdefghijklmnopqrst')).toBe(true); // 20 chars
    });

    it('should accept IDs with dashes and underscores', () => {
      const ss = new SessionSecurity({ secret });
      expect(ss.isValidSessionIdFormat('abc-def_ghi-jkl_mnop-qrs')).toBe(true);
    });

    it('should reject short IDs', () => {
      const ss = new SessionSecurity({ secret });
      expect(ss.isValidSessionIdFormat('short')).toBe(false);
    });

    it('should reject empty or null', () => {
      const ss = new SessionSecurity({ secret });
      expect(ss.isValidSessionIdFormat('')).toBe(false);
      expect(ss.isValidSessionIdFormat(null)).toBe(false);
    });
  });

  describe('signSessionId / verifySessionId', () => {
    const validSessionId = 'abcdefghijklmnopqrstuvwxyz'; // 26 chars

    it('should sign and verify a session ID', () => {
      const ss = new SessionSecurity({ secret });
      const signed = ss.signSessionId(validSessionId);
      expect(signed).not.toBe(validSessionId);
      expect(signed).toContain('.');
      const result = ss.verifySessionId(signed);
      expect(result).toBe(validSessionId);
    });

    it('should return null for invalid format session ID', () => {
      const ss = new SessionSecurity({ secret });
      expect(ss.signSessionId('short')).toBeNull();
    });

    it('should return null for null input to sign', () => {
      const ss = new SessionSecurity({ secret });
      expect(ss.signSessionId(null)).toBeNull();
    });

    it('should return null for tampered signed ID', () => {
      const ss = new SessionSecurity({ secret });
      const signed = ss.signSessionId(validSessionId);
      expect(ss.verifySessionId(signed + 'tamper')).toBeNull();
    });

    it('should return null for null/empty verify input', () => {
      const ss = new SessionSecurity({ secret });
      expect(ss.verifySessionId(null)).toBeNull();
      expect(ss.verifySessionId('')).toBeNull();
    });

    it('should return null for invalid format (no dot)', () => {
      const ss = new SessionSecurity({ secret });
      expect(ss.verifySessionId('nodotinthisstring')).toBeNull();
    });

    it('should return null when signature is empty', () => {
      const ss = new SessionSecurity({ secret });
      expect(ss.verifySessionId(validSessionId + '.')).toBeNull();
    });

    it('should return null when session ID part fails format validation', () => {
      const ss = new SessionSecurity({ secret });
      // "short" is too short to pass isValidSessionIdFormat, but has a dot separator
      expect(ss.verifySessionId('short.somesignature')).toBeNull();
    });
  });

  describe('generateSecureToken / verifySecureToken', () => {
    const validSessionId = 'abcdefghijklmnopqrstuvwxyz';

    it('should generate and verify a token', () => {
      const ss = new SessionSecurity({ secret });
      const { token, issuedAt } = ss.generateSecureToken(validSessionId);
      expect(token).toBeDefined();
      expect(typeof issuedAt).toBe('number');
      expect(ss.verifySecureToken(validSessionId, token, issuedAt)).toBe(true);
    });

    it('should include userAgent in token', () => {
      const ss = new SessionSecurity({ secret });
      const { token, issuedAt } = ss.generateSecureToken(validSessionId, 'Mozilla/5.0');
      expect(ss.verifySecureToken(validSessionId, token, issuedAt, 'Mozilla/5.0')).toBe(true);
      expect(ss.verifySecureToken(validSessionId, token, issuedAt, 'DifferentAgent')).toBe(false);
    });

    it('should reject expired tokens', () => {
      const ss = new SessionSecurity({ secret });
      const expiredIssuedAt = Date.now() - 10 * 60 * 1000; // 10 min ago
      const data = `${validSessionId}::${expiredIssuedAt}`;
      const token = ss._hmacHex(data).substring(0, 64);
      expect(ss.verifySecureToken(validSessionId, token, expiredIssuedAt, '', 5 * 60 * 1000)).toBe(false);
    });

    it('should reject future timestamps (clock skew guard)', () => {
      const ss = new SessionSecurity({ secret });
      const futureTime = Date.now() + 120000;
      expect(ss.verifySecureToken(validSessionId, 'token', futureTime)).toBe(false);
    });

    it('should reject null/invalid inputs', () => {
      const ss = new SessionSecurity({ secret });
      expect(ss.verifySecureToken(null, 'token', Date.now())).toBe(false);
      expect(ss.verifySecureToken(validSessionId, null, Date.now())).toBe(false);
      expect(ss.verifySecureToken(validSessionId, 'token', 'notanumber')).toBe(false);
    });

    it('should throw for null sessionId in generate', () => {
      const ss = new SessionSecurity({ secret });
      expect(() => ss.generateSecureToken(null)).toThrow('sessionId is required');
    });
  });

  describe('_hmacHex', () => {
    it('should produce hex string', () => {
      const ss = new SessionSecurity({ secret });
      const hex = ss._hmacHex('test');
      expect(typeof hex).toBe('string');
      expect(/^[0-9a-f]+$/.test(hex)).toBe(true);
    });
  });

  describe('_timingSafeEqualHex', () => {
    it('should return true for equal strings', () => {
      const ss = new SessionSecurity({ secret });
      expect(ss._timingSafeEqualHex('abc123', 'abc123')).toBe(true);
    });

    it('should return false for different strings', () => {
      const ss = new SessionSecurity({ secret });
      expect(ss._timingSafeEqualHex('abc123', 'def456')).toBe(false);
    });

    it('should return false for different lengths', () => {
      const ss = new SessionSecurity({ secret });
      expect(ss._timingSafeEqualHex('abc', 'abcdef')).toBe(false);
    });

    it('should return false for non-string inputs', () => {
      const ss = new SessionSecurity({ secret });
      expect(ss._timingSafeEqualHex(null, 'abc')).toBe(false);
    });

    it('should return false when timingSafeEqual throws', () => {
      const crypto = require('node:crypto');
      const ss = new SessionSecurity({ secret });
      const orig = crypto.timingSafeEqual;
      crypto.timingSafeEqual = () => { throw new Error('mock throw'); };
      expect(ss._timingSafeEqualHex('abc123', 'abc123')).toBe(false);
      crypto.timingSafeEqual = orig;
    });
  });
});
