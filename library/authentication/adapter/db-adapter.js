// library/authentication/adapter/dbAdapter.js
// Database authentication adapter

const crypto = require('crypto');
const Result = require('../result');

/**
 * Database Authentication Adapter
 * Authenticates credentials against a database with salted MD5 password hashing
 */
class DbAdapter {
  /**
   * Database adapter (PostgreSQLAdapter, MySQLAdapter, etc.)
   * @type {Object}
   */
  db = null;

  /**
   * Username
   * @type {string}
   */
  username = null;

  /**
   * Password
   * @type {string}
   */
  password = null;

  /**
   * Table name for users
   * @type {string}
   */
  tableName = 'users';

  /**
   * Identity column name
   * @type {string}
   */
  identityColumn = 'username';

  /**
   * Credential column name (password hash)
   * @type {string}
   */
  credentialColumn = 'password_hash';

  /**
   * Salt column name
   * @type {string}
   */
  saltColumn = 'password_salt';

  /**
   * Active status column
   * @type {string}
   */
  activeColumn = 'is_active';

  /**
   * Constructor
   * @param {Object} db - Database adapter instance (PostgreSQLAdapter, MySQLAdapter, etc.)
   * @param {string} tableName - Users table name
   * @param {string} identityColumn - Username column
   * @param {string} credentialColumn - Password hash column
   * @param {string} saltColumn - Password salt column
   */
  constructor(db, tableName = 'users', identityColumn = 'username', credentialColumn = 'password_hash', saltColumn = 'password_salt') {
    this.db = db;
    this.tableName = tableName;
    this.identityColumn = identityColumn;
    this.credentialColumn = credentialColumn;
    this.saltColumn = saltColumn;
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
   * Performs authentication against the database
   * @returns {Promise<Result>}
   */
  async authenticate() {
    try {
      console.log('DbAdapter.authenticate() called');
      console.log('Table:', this.tableName);
      console.log('Identity column:', this.identityColumn);
      console.log('Username:', this.username);
      console.log('Active column:', this.activeColumn);


      // Query for user by username and active status using Select query builder

      const Select = require('../../db/sql/select');
      const select = new Select()
        .from(this.tableName)
        .where(`${this.identityColumn} = ?`, this.username)
        .where(`${this.activeColumn} = ?`, true)
        .limit(1);

      const sql = select.toString();
      const params = select.getParameters();
      console.log('SQL Query:', sql);
      console.log('Parameters:', params);

      // Use db.query(sql, params) to fetch results
      const results = await this.db.query(sql, params);

      console.log('Query results:', results);

      const user = results.length > 0 ? results[0] : null;
      console.log('User found:', user ? 'Yes' : 'No');

      // User not found
      if(!user) {
        return new Result(
          Result.FAILURE_IDENTITY_NOT_FOUND,
          null,
          ['Authentication unsuccessful']
        );
      }

      // Verify password
      // If salt column exists in user record, use salted hash (MD5(password|salt))
      // Otherwise, do direct comparison (for when salt column doesn't exist yet)
      let passwordValid = false;

      if(user[this.saltColumn]) {
        // Compute password hash using MD5(password|salt)
        const computedHash = crypto
          .createHash('md5')
          .update(`${this.password}|${user[this.saltColumn]}`)
          .digest('hex');
        passwordValid = (computedHash === user[this.credentialColumn]);
      } else {
        // No salt column - direct comparison (temporary, until salt is implemented)
        passwordValid = (this.password === user[this.credentialColumn]);
      }

      if(!passwordValid) {
        return new Result(
          Result.FAILURE_CREDENTIAL_INVALID,
          null,
          ['Authentication unsuccessful']
        );
      }

      // Authentication successful - prepare identity data
      const identity = {
        ...user
      };

      // Remove sensitive data from identity
      delete identity[this.credentialColumn];
      delete identity[this.saltColumn];

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