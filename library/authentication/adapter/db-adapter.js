// library/authentication/adapter/db-adapter.js
// Database authentication adapter

const crypto = require('crypto');
const Result = require('../result');

/**
 * Database Authentication Adapter
 * Authenticates credentials against a database table (single or multi-table via JOIN)
 *
 * Single-table usage:
 *   new DbAdapter(db, 'users', 'email', 'password_hash', 'password_salt')
 *
 * Multi-table usage (credentials in separate table):
 *   new DbAdapter(db, 'app_user', 'email', 'password_hash', null, {
 *     credentialTable: 'user_auth_password',
 *     credentialJoinColumn: 'user_id',
 *     identityJoinColumn: 'user_id',
 *     passwordAlgoColumn: 'password_algo',
 *     activeCondition: { column: 'status', value: 'active' }
 *   })
 */
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

  /**
   * @param {Object} db - Database adapter instance
   * @param {string} tableName - Identity table name
   * @param {string} identityColumn - Username/email column
   * @param {string} credentialColumn - Password hash column
   * @param {string|null} saltColumn - Salt column (null if not used)
   * @param {Object} [options={}] - Multi-table and algorithm options
   * @param {string} [options.credentialTable] - Separate credentials table name
   * @param {string} [options.credentialJoinColumn='user_id'] - FK column on credential table
   * @param {string} [options.identityJoinColumn='user_id'] - PK column on identity table
   * @param {string} [options.passwordAlgoColumn] - Column storing password algorithm
   * @param {Object} [options.activeCondition] - Override active check { column, value }
   */
  constructor(db, tableName = 'users', identityColumn = 'username', credentialColumn = 'password_hash', saltColumn = 'password_salt', options = {}) {
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
  }

  /**
   * Set the username
   * @param {string} username
   * @returns {DbAdapter}
   */
  setUsername(username) {
    this.username = username;
    return this;
  }

  /**
   * Set the password
   * @param {string} password
   * @returns {DbAdapter}
   */
  setPassword(password) {
    this.password = password;
    return this;
  }

  /**
   * Build the SELECT query for authentication
   * Supports single-table and multi-table (JOIN) modes
   * @private
   * @returns {Select}
   */
  _buildAuthQuery() {
    const Select = require('../../db/sql/select');
    const select = new Select();

    if (this.credentialTable) {
      // Multi-table mode: JOIN identity table with credential table
      select
        .from({ u: this.tableName })
        .join(
          { c: this.credentialTable },
          `u.${this.identityJoinColumn} = c.${this.credentialJoinColumn}`
        )
        .where(`u.${this.identityColumn} = ?`, this.username);

      // Active condition override or default
      if (this.activeCondition) {
        select.where(`u.${this.activeCondition.column} = ?`, this.activeCondition.value);
      } else {
        select.where(`u.${this.activeColumn} = ?`, true);
      }
    } else {
      // Single-table mode: original behavior
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
   * Verify password against stored hash
   * Supports argon2id/argon2i, MD5 with salt, and direct comparison
   * @private
   * @param {Object} user - User row from database
   * @returns {Promise<boolean>}
   */
  async _verifyPassword(user) {
    const algo = this.passwordAlgoColumn ? user[this.passwordAlgoColumn] : null;

    // Argon2 verification (hash contains embedded salt)
    if (algo && algo.startsWith('argon2')) {
      const argon2 = require('argon2');
      return argon2.verify(user[this.credentialColumn], this.password);
    }

    // Legacy MD5 with salt
    if (this.saltColumn && user[this.saltColumn]) {
      const computedHash = crypto
        .createHash('md5')
        .update(`${this.password}|${user[this.saltColumn]}`)
        .digest('hex');
      return computedHash === user[this.credentialColumn];
    }

    // Direct comparison fallback
    return this.password === user[this.credentialColumn];
  }

  /**
   * Performs authentication against the database
   * @returns {Promise<Result>}
   */
  async authenticate() {
    try {
      const select = this._buildAuthQuery();
      const sql = select.toString();
      const params = select.getParameters();

      console.log('DbAdapter.authenticate() -', this.credentialTable ? 'multi-table' : 'single-table');
      console.log('SQL Query:', sql);
      console.log('Parameters:', params);

      const results = await this.db.query(sql, params);
      const user = results.length > 0 ? results[0] : null;

      console.log('User found:', user ? 'Yes' : 'No');

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
      if (this.saltColumn) {
        delete identity[this.saltColumn];
      }
      if (this.passwordAlgoColumn) {
        delete identity[this.passwordAlgoColumn];
      }

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
