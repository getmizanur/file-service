// library/authentication/adapter/db-adapter.js
// Database authentication adapter

const crypto = require('crypto');
const Result = require('../result');

class DbAdapter {
  /** @type {Object} Database adapter instance */
  db = null;

  /** @type {string} */
  username = null;

  /** @type {string} */
  password = null;

  /** @type {string} Identity table name */
  tableName = 'users';

  /** @type {string} Identity/username column on identity table */
  identityColumn = 'username';

  /** @type {string} Password hash column */
  credentialColumn = 'password_hash';

  /** @type {string|null} Salt column (null if not used) */
  saltColumn = 'password_salt';

  /** @type {string} Default active status column (single-table mode) */
  activeColumn = 'is_active';

  // Multi-table options
  /** @type {string|null} Credential table name for JOIN */
  credentialTable = null;

  /** @type {string} Join column on the credential table */
  credentialJoinColumn = 'user_id';

  /** @type {string} Join column on the identity table */
  identityJoinColumn = 'user_id';

  /** @type {Object|null} Override active condition, e.g. { column: 'status', value: 'active' } */
  activeCondition = null;

  /** @type {string|null} Column that stores password algorithm (e.g. 'argon2id') */
  passwordAlgoColumn = null;

  /** @type {boolean} */
  debug = false;

  /**
   * @param {Object} db - Database adapter instance (must support query(sql, params) OR be used by Select.execute())
   * @param {string} tableName
   * @param {string} identityColumn
   * @param {string} credentialColumn
   * @param {string|null} saltColumn
   * @param {Object} [options={}]
   */
  constructor(
    db,
    tableName = 'users',
    identityColumn = 'username',
    credentialColumn = 'password_hash',
    saltColumn = 'password_salt',
    options = {}
  ) {
    this.db = db;
    this.tableName = tableName;
    this.identityColumn = identityColumn;
    this.credentialColumn = credentialColumn;
    this.saltColumn = saltColumn;

    if (options.credentialTable) {
      this.credentialTable = options.credentialTable;
      this.credentialJoinColumn = options.credentialJoinColumn || 'user_id';
      this.identityJoinColumn = options.identityJoinColumn || 'user_id';
    }

    if (options.activeCondition) {
      this.activeCondition = options.activeCondition;
    }

    if (options.passwordAlgoColumn) {
      this.passwordAlgoColumn = options.passwordAlgoColumn;
    }

    this.debug = !!options.debug;
  }

  setUsername(username) {
    this.username = username;
    return this;
  }

  setPassword(password) {
    this.password = password;
    return this;
  }

  /**
   * Build the SELECT query for authentication
   * @private
   * @returns {Select}
   */
  _buildAuthQuery() {
    const Select = require('../../db/sql/select');

    // IMPORTANT: pass adapter so Select.execute() works and placeholder formatting is correct
    const select = new Select(this.db);

    if (this.credentialTable) {
      // Multi-table: JOIN identity table with credential table
      select
        .from({ u: this.tableName })
        .join(
          { c: this.credentialTable },
          `u.${this.identityJoinColumn} = c.${this.credentialJoinColumn}`
        )
        .where(`u.${this.identityColumn} = ?`, this.username);

      if (this.activeCondition) {
        select.where(`u.${this.activeCondition.column} = ?`, this.activeCondition.value);
      } else {
        select.where(`u.${this.activeColumn} = ?`, true);
      }
    } else {
      // Single-table
      select
        .from(this.tableName)
        .where(`${this.identityColumn} = ?`, this.username);

      if (this.activeCondition) {
        select.where(`${this.activeCondition.column} = ?`, this.activeCondition.value);
      } else {
        select.where(`${this.activeColumn} = ?`, true);
      }
    }

    select.limit(1);
    return select;
  }

  /**
   * Normalize different adapter result formats to { rows, rowCount }
   * Supports:
   * - new adapters: { rows, rowCount, insertedId }
   * - pg-style: { rows, rowCount }
   * - legacy: array of rows
   * @private
   */
  _normalizeResult(result) {
    if (!result) return { rows: [], rowCount: 0 };

    if (Array.isArray(result)) {
      return { rows: result, rowCount: result.length };
    }

    const rows = Array.isArray(result.rows) ? result.rows : [];
    const rowCount = Number.isFinite(result.rowCount) ? result.rowCount : rows.length;

    return { rows, rowCount };
  }

  /**
   * Timing-safe string equality
   * @private
   */
  _timingSafeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    try {
      return crypto.timingSafeEqual(bufA, bufB);
    } catch (_) {
      return false;
    }
  }

  /**
   * Verify password against stored hash
   * Supports argon2id/argon2i, MD5 with salt, and direct comparison
   * @private
   * @param {Object} user
   * @returns {Promise<boolean>}
   */
  async _verifyPassword(user) {
    const algo = this.passwordAlgoColumn ? user[this.passwordAlgoColumn] : null;

    // Argon2 verification (hash contains embedded salt)
    if (algo && typeof algo === 'string' && algo.startsWith('argon2')) {
      const argon2 = require('argon2');
      const stored = user[this.credentialColumn];
      if (!stored) return false;
      return argon2.verify(stored, this.password);
    }

    // Legacy MD5 with salt
    if (this.saltColumn && user[this.saltColumn]) {
      const computedHash = crypto
        .createHash('md5')
        .update(`${this.password}|${user[this.saltColumn]}`)
        .digest('hex');

      const stored = user[this.credentialColumn] || '';
      return this._timingSafeEqual(computedHash, String(stored));
    }

    // Direct comparison fallback (not recommended; keep for legacy)
    const stored = user[this.credentialColumn];
    if (stored === undefined || stored === null) return false;
    return this._timingSafeEqual(String(this.password), String(stored));
  }

  /**
   * Performs authentication against the database
   * @returns {Promise<Result>}
   */
  async authenticate() {
    try {
      if (!this.db) {
        return new Result(
          Result.FAILURE_UNCATEGORIZED,
          null,
          ['Authentication error: Database adapter not set']
        );
      }

      if (!this.username || !this.password) {
        return new Result(
          Result.FAILURE_CREDENTIAL_INVALID,
          null,
          ['Authentication unsuccessful']
        );
      }

      const select = this._buildAuthQuery();

      // Preferred: builder executes using adapter & proper placeholders
      const execResult = await select.execute();
      const { rows } = this._normalizeResult(execResult);

      if (this.debug) {
        try {
          console.debug('[DbAdapter] mode:', this.credentialTable ? 'multi-table' : 'single-table');
          console.debug('[DbAdapter] sql:', select.toString());
          console.debug('[DbAdapter] params:', select.getParameters());
          console.debug('[DbAdapter] rows:', rows.length);
        } catch (_) {}
      }

      const user = rows.length > 0 ? rows[0] : null;

      if (!user) {
        return new Result(
          Result.FAILURE_IDENTITY_NOT_FOUND,
          null,
          ['Authentication unsuccessful']
        );
      }

      const passwordValid = await this._verifyPassword(user);

      if (!passwordValid) {
        return new Result(
          Result.FAILURE_CREDENTIAL_INVALID,
          null,
          ['Authentication unsuccessful']
        );
      }

      // Prepare identity - remove sensitive fields
      const identity = { ...user };
      delete identity[this.credentialColumn];
      if (this.saltColumn) delete identity[this.saltColumn];
      if (this.passwordAlgoColumn) delete identity[this.passwordAlgoColumn];

      return new Result(
        Result.SUCCESS,
        identity,
        ['Authentication successful']
      );
    } catch (error) {
      return new Result(
        Result.FAILURE_UNCATEGORIZED,
        null,
        ['Authentication error: ' + error.message]
      );
    }
  }
}

module.exports = DbAdapter;