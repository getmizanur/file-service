const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const DbAdapter = require(path.join(projectRoot, 'library/authentication/adapter/db-adapter'));
const Result = require(path.join(projectRoot, 'library/authentication/result'));

describe('DbAdapter', () => {
  let mockDb;
  let mockSelectInstance;

  beforeEach(() => {
    mockSelectInstance = {
      from: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue([]),
      toString: jest.fn().mockReturnValue('SELECT ...'),
      getParameters: jest.fn().mockReturnValue([])
    };

    // Mock the Select module
    jest.resetModules();
    jest.doMock(path.join(projectRoot, 'library/db/sql/select'), () => {
      return jest.fn().mockImplementation(() => mockSelectInstance);
    });

    mockDb = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 })
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  // ---- constructor ----
  describe('constructor', () => {
    it('should set default properties', () => {
      const adapter = new DbAdapter(mockDb);
      expect(adapter.db).toBe(mockDb);
      expect(adapter.tableName).toBe('users');
      expect(adapter.identityColumn).toBe('username');
      expect(adapter.credentialColumn).toBe('password_hash');
      expect(adapter.saltColumn).toBe('password_salt');
    });

    it('should accept custom table and column names', () => {
      const adapter = new DbAdapter(mockDb, 'accounts', 'email', 'pwd_hash', 'pwd_salt');
      expect(adapter.tableName).toBe('accounts');
      expect(adapter.identityColumn).toBe('email');
      expect(adapter.credentialColumn).toBe('pwd_hash');
      expect(adapter.saltColumn).toBe('pwd_salt');
    });

    it('should configure multi-table options', () => {
      const adapter = new DbAdapter(mockDb, 'users', 'username', 'password_hash', 'password_salt', {
        credentialTable: 'credentials',
        credentialJoinColumn: 'uid',
        identityJoinColumn: 'id'
      });
      expect(adapter.credentialTable).toBe('credentials');
      expect(adapter.credentialJoinColumn).toBe('uid');
      expect(adapter.identityJoinColumn).toBe('id');
    });

    it('should configure activeCondition option', () => {
      const adapter = new DbAdapter(mockDb, 'users', 'username', 'password_hash', 'password_salt', {
        activeCondition: { column: 'status', value: 'active' }
      });
      expect(adapter.activeCondition).toEqual({ column: 'status', value: 'active' });
    });

    it('should configure passwordAlgoColumn option', () => {
      const adapter = new DbAdapter(mockDb, 'users', 'username', 'password_hash', null, {
        passwordAlgoColumn: 'hash_algo'
      });
      expect(adapter.passwordAlgoColumn).toBe('hash_algo');
    });
  });

  // ---- setUsername / setPassword ----
  describe('setUsername / setPassword', () => {
    it('should set username and return this for chaining', () => {
      const adapter = new DbAdapter(mockDb);
      const result = adapter.setUsername('john');
      expect(adapter.username).toBe('john');
      expect(result).toBe(adapter);
    });

    it('should set password and return this for chaining', () => {
      const adapter = new DbAdapter(mockDb);
      const result = adapter.setPassword('secret');
      expect(adapter.password).toBe('secret');
      expect(result).toBe(adapter);
    });
  });

  // ---- _normalizeResult ----
  describe('_normalizeResult', () => {
    it('should return empty result for null', () => {
      const adapter = new DbAdapter(mockDb);
      expect(adapter._normalizeResult(null)).toEqual({ rows: [], rowCount: 0 });
    });

    it('should normalize array results', () => {
      const adapter = new DbAdapter(mockDb);
      const rows = [{ id: 1 }, { id: 2 }];
      const result = adapter._normalizeResult(rows);
      expect(result.rows).toBe(rows);
      expect(result.rowCount).toBe(2);
    });

    it('should normalize object results with rows', () => {
      const adapter = new DbAdapter(mockDb);
      const result = adapter._normalizeResult({ rows: [{ id: 1 }], rowCount: 1 });
      expect(result.rows).toEqual([{ id: 1 }]);
      expect(result.rowCount).toBe(1);
    });

    it('should handle object without rows array', () => {
      const adapter = new DbAdapter(mockDb);
      const result = adapter._normalizeResult({ something: 'else' });
      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
    });
  });

  // ---- _timingSafeEqual ----
  describe('_timingSafeEqual', () => {
    it('should return true for identical strings', () => {
      const adapter = new DbAdapter(mockDb);
      expect(adapter._timingSafeEqual('hello', 'hello')).toBe(true);
    });

    it('should return false for different strings', () => {
      const adapter = new DbAdapter(mockDb);
      expect(adapter._timingSafeEqual('hello', 'world')).toBe(false);
    });

    it('should return false for different lengths', () => {
      const adapter = new DbAdapter(mockDb);
      expect(adapter._timingSafeEqual('short', 'longer-string')).toBe(false);
    });

    it('should return false for non-string inputs', () => {
      const adapter = new DbAdapter(mockDb);
      expect(adapter._timingSafeEqual(null, 'hello')).toBe(false);
      expect(adapter._timingSafeEqual('hello', 123)).toBe(false);
    });
  });

  // ---- _timingSafeEqual error catch ----
  describe('_timingSafeEqual catch block', () => {
    it('should return false when timingSafeEqual throws', () => {
      const crypto = require('node:crypto');
      const adapter = new DbAdapter(mockDb);
      const orig = crypto.timingSafeEqual;
      crypto.timingSafeEqual = () => { throw new Error('mock throw'); };
      expect(adapter._timingSafeEqual('hello', 'hello')).toBe(false);
      crypto.timingSafeEqual = orig;
    });
  });

  // ---- _verifyPassword ----
  describe('_verifyPassword', () => {
    it('should verify MD5 with salt', async () => {
      const crypto = require('node:crypto');
      const adapter = new DbAdapter(mockDb);
      adapter.password = 'mypassword';

      const salt = 'randomsalt';
      const hash = crypto.createHash('md5').update(`mypassword|${salt}`).digest('hex');

      const user = {
        password_hash: hash,
        password_salt: salt
      };

      expect(await adapter._verifyPassword(user)).toBe(true);
    });

    it('should fail MD5 verification with wrong password', async () => {
      const crypto = require('node:crypto');
      const adapter = new DbAdapter(mockDb);
      adapter.password = 'wrongpassword';

      const salt = 'randomsalt';
      const hash = crypto.createHash('md5').update(`correctpassword|${salt}`).digest('hex');

      const user = {
        password_hash: hash,
        password_salt: salt
      };

      expect(await adapter._verifyPassword(user)).toBe(false);
    });

    it('should do direct comparison when no salt column', async () => {
      const adapter = new DbAdapter(mockDb, 'users', 'username', 'password_hash', null);
      adapter.password = 'plaintext';

      const user = { password_hash: 'plaintext' };
      expect(await adapter._verifyPassword(user)).toBe(true);
    });

    it('should return false for direct comparison with wrong password', async () => {
      const adapter = new DbAdapter(mockDb, 'users', 'username', 'password_hash', null);
      adapter.password = 'wrong';

      const user = { password_hash: 'correct' };
      expect(await adapter._verifyPassword(user)).toBe(false);
    });

    it('should return false if stored password is null (direct)', async () => {
      const adapter = new DbAdapter(mockDb, 'users', 'username', 'password_hash', null);
      adapter.password = 'test';
      expect(await adapter._verifyPassword({ password_hash: null })).toBe(false);
    });

    it('should return false if stored password is null (salt path but no salt value)', async () => {
      const adapter = new DbAdapter(mockDb);
      adapter.password = 'test';
      // saltColumn is set but user has no salt value -> falls through to direct comparison
      expect(await adapter._verifyPassword({ password_hash: null, password_salt: null })).toBe(false);
    });

    it('should verify argon2 password when algo starts with argon2', async () => {
      // Mock argon2
      jest.mock('argon2', () => ({
        verify: jest.fn().mockResolvedValue(true)
      }), { virtual: true });

      const adapter = new DbAdapter(mockDb, 'users', 'username', 'password_hash', null, {
        passwordAlgoColumn: 'hash_algo'
      });
      adapter.password = 'mypassword';

      const user = {
        password_hash: '$argon2id$v=19$m=65536$hash',
        hash_algo: 'argon2id'
      };

      expect(await adapter._verifyPassword(user)).toBe(true);
    });

    it('should return false for argon2 when stored password is null', async () => {
      jest.mock('argon2', () => ({
        verify: jest.fn().mockResolvedValue(false)
      }), { virtual: true });

      const adapter = new DbAdapter(mockDb, 'users', 'username', 'password_hash', null, {
        passwordAlgoColumn: 'hash_algo'
      });
      adapter.password = 'mypassword';

      const user = {
        password_hash: null,
        hash_algo: 'argon2id'
      };

      expect(await adapter._verifyPassword(user)).toBe(false);
    });
  });

  // ---- authenticate ----
  describe('authenticate', () => {
    it('should return FAILURE_UNCATEGORIZED when no db', async () => {
      const adapter = new DbAdapter(null);
      adapter.setUsername('user').setPassword('pass');
      const result = await adapter.authenticate();
      expect(result.getCode()).toBe(Result.FAILURE_UNCATEGORIZED);
      expect(result.isValid()).toBe(false);
      expect(result.getMessages()).toContain('Authentication error: Database adapter not set');
    });

    it('should return FAILURE_CREDENTIAL_INVALID when no username', async () => {
      const adapter = new DbAdapter(mockDb);
      adapter.setPassword('pass');
      const result = await adapter.authenticate();
      expect(result.getCode()).toBe(Result.FAILURE_CREDENTIAL_INVALID);
    });

    it('should return FAILURE_CREDENTIAL_INVALID when no password', async () => {
      const adapter = new DbAdapter(mockDb);
      adapter.setUsername('user');
      const result = await adapter.authenticate();
      expect(result.getCode()).toBe(Result.FAILURE_CREDENTIAL_INVALID);
    });

    it('should return FAILURE_IDENTITY_NOT_FOUND when user not found', async () => {
      mockSelectInstance.execute.mockResolvedValue([]);
      const adapter = new DbAdapter(mockDb);
      adapter.setUsername('user').setPassword('pass');
      const result = await adapter.authenticate();
      expect(result.getCode()).toBe(Result.FAILURE_IDENTITY_NOT_FOUND);
      expect(result.getIdentity()).toBe(null);
    });

    it('should return FAILURE_CREDENTIAL_INVALID on wrong password', async () => {
      const crypto = require('node:crypto');
      const salt = 'salt123';
      const correctHash = crypto.createHash('md5').update(`correct|${salt}`).digest('hex');

      mockSelectInstance.execute.mockResolvedValue([
        { username: 'user', password_hash: correctHash, password_salt: salt, is_active: true }
      ]);

      const adapter = new DbAdapter(mockDb);
      adapter.setUsername('user').setPassword('wrong');
      const result = await adapter.authenticate();
      expect(result.getCode()).toBe(Result.FAILURE_CREDENTIAL_INVALID);
    });

    it('should return SUCCESS on correct password', async () => {
      const crypto = require('node:crypto');
      const salt = 'salt123';
      const hash = crypto.createHash('md5').update(`mypass|${salt}`).digest('hex');

      mockSelectInstance.execute.mockResolvedValue([
        { username: 'user', password_hash: hash, password_salt: salt, is_active: true, id: 42 }
      ]);

      const adapter = new DbAdapter(mockDb);
      adapter.setUsername('user').setPassword('mypass');
      const result = await adapter.authenticate();
      expect(result.getCode()).toBe(Result.SUCCESS);
      expect(result.isValid()).toBe(true);

      const identity = result.getIdentity();
      expect(identity.username).toBe('user');
      expect(identity.id).toBe(42);
      // Sensitive fields should be removed
      expect(identity.password_hash).toBeUndefined();
      expect(identity.password_salt).toBeUndefined();
    });

    it('should log debug info when debug is enabled', async () => {
      const crypto = require('node:crypto');
      const salt = 'salt123';
      const hash = crypto.createHash('md5').update(`mypass|${salt}`).digest('hex');

      mockSelectInstance.execute.mockResolvedValue([
        { username: 'user', password_hash: hash, password_salt: salt, id: 1 }
      ]);

      const adapter = new DbAdapter(mockDb);
      adapter.debug = true;
      adapter.setUsername('user').setPassword('mypass');
      const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      const result = await adapter.authenticate();
      expect(result.isValid()).toBe(true);
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('[DbAdapter]'), expect.anything());
      spy.mockRestore();
    });

    it('should return FAILURE_UNCATEGORIZED on query error', async () => {
      mockSelectInstance.execute.mockRejectedValue(new Error('DB connection lost'));

      const adapter = new DbAdapter(mockDb);
      adapter.setUsername('user').setPassword('pass');
      const result = await adapter.authenticate();
      expect(result.getCode()).toBe(Result.FAILURE_UNCATEGORIZED);
      expect(result.getMessages()[0]).toContain('DB connection lost');
    });

    it('should remove passwordAlgoColumn from identity', async () => {
      const crypto = require('node:crypto');
      const salt = 'salt';
      const hash = crypto.createHash('md5').update(`pass|${salt}`).digest('hex');

      mockSelectInstance.execute.mockResolvedValue([
        { username: 'user', password_hash: hash, password_salt: salt, hash_algo: 'md5', id: 1 }
      ]);

      const adapter = new DbAdapter(mockDb, 'users', 'username', 'password_hash', 'password_salt', {
        passwordAlgoColumn: 'hash_algo'
      });
      adapter.setUsername('user').setPassword('pass');
      const result = await adapter.authenticate();
      expect(result.isValid()).toBe(true);
      expect(result.getIdentity().hash_algo).toBeUndefined();
    });
  });

  // ---- _buildAuthQuery (single-table) ----
  describe('_buildAuthQuery (single-table)', () => {
    it('should build single-table query with default active column', () => {
      const adapter = new DbAdapter(mockDb);
      adapter.setUsername('testuser');
      const select = adapter._buildAuthQuery();
      expect(mockSelectInstance.from).toHaveBeenCalledWith('users');
      expect(mockSelectInstance.where).toHaveBeenCalledWith('username = ?', 'testuser');
      expect(mockSelectInstance.where).toHaveBeenCalledWith('is_active = ?', true);
      expect(mockSelectInstance.limit).toHaveBeenCalledWith(1);
    });

    it('should use custom activeCondition', () => {
      const adapter = new DbAdapter(mockDb, 'users', 'username', 'password_hash', 'password_salt', {
        activeCondition: { column: 'status', value: 'enabled' }
      });
      adapter.setUsername('testuser');
      adapter._buildAuthQuery();
      expect(mockSelectInstance.where).toHaveBeenCalledWith('status = ?', 'enabled');
    });
  });

  // ---- _buildAuthQuery (multi-table) ----
  describe('_buildAuthQuery (multi-table)', () => {
    it('should build multi-table query with JOIN', () => {
      const adapter = new DbAdapter(mockDb, 'users', 'username', 'password_hash', 'password_salt', {
        credentialTable: 'credentials',
        credentialJoinColumn: 'uid',
        identityJoinColumn: 'id'
      });
      adapter.setUsername('testuser');
      adapter._buildAuthQuery();
      expect(mockSelectInstance.from).toHaveBeenCalledWith({ u: 'users' });
      expect(mockSelectInstance.join).toHaveBeenCalledWith(
        { c: 'credentials' },
        'u.id = c.uid'
      );
      expect(mockSelectInstance.where).toHaveBeenCalledWith('u.username = ?', 'testuser');
      expect(mockSelectInstance.where).toHaveBeenCalledWith('u.is_active = ?', true);
    });

    it('should use custom activeCondition in multi-table', () => {
      const adapter = new DbAdapter(mockDb, 'users', 'username', 'password_hash', 'password_salt', {
        credentialTable: 'credentials',
        activeCondition: { column: 'status', value: 'active' }
      });
      adapter.setUsername('testuser');
      adapter._buildAuthQuery();
      expect(mockSelectInstance.where).toHaveBeenCalledWith('u.status = ?', 'active');
    });
  });
});
