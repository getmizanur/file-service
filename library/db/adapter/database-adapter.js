/**
 * Database Adapter Interface - Provides consistent database operations
 * Supports multiple database backends through unified interface
 *
 * Key architectural goal:
 * - Callers should NOT need to manually "prime" the DB connection in the dispatcher.
 * - Concrete adapters should call `await this.ensureConnected()` inside query()/prepare()/etc.
 * - Base helper methods (fetchAll/insert/update/transaction...) will also call ensureConnected()
 *   so higher-level code stays clean.
 */
class DatabaseAdapter {
  constructor(config = {}) {
    this.config = config;

    // Concrete adapters may set this.connection OR their own handle (pool/client/etc.)
    this.connection = null;

    // NEW: single-flight connection guard
    this._connected = false;
    this._connectPromise = null;
  }

  /**
   * True if adapter believes it is connected.
   * Concrete adapters may override for more accurate checks (e.g., pool state).
   */
  isConnected() {
    // preserve legacy heuristic while supporting the new flag
    return this._connected === true || this.connection !== null;
  }

  /**
   * Ensure the underlying connection/pool is established.
   *
   * - Safe to call multiple times.
   * - Prevents concurrent connect storms by sharing a single promise.
   *
   * Concrete adapters should call this at the start of query()/prepare()/transaction(), etc.
   * Base helper methods below call this too, so most app code never needs to.
   */
  async ensureConnected() {
    if (this.isConnected()) {
      this._connected = true;
      return;
    }

    if (this._connectPromise) {
      await this._connectPromise;
      return;
    }

    this._connectPromise = (async () => {
      await this.connect();          // implemented by concrete adapter
      this._connected = true;

      // If concrete adapter uses `this.connection`, this will now also reflect connected state
    })();

    try {
      await this._connectPromise;
    } catch (err) {
      // allow retry on next call
      this._connected = false;
      this._connectPromise = null;
      throw err;
    }
  }

  /**
   * Optional helper for concrete adapters after disconnect/failure.
   */
  _markDisconnected() {
    this._connected = false;
    this._connectPromise = null;
    this.connection = null;
  }

  /**
   * Create a new Select query builder
   * @returns {Select} - New Select instance
   */
  select() {
    const Select = require('../sql/select');
    return new Select(this);
  }

  /**
   * Create a new Insert query builder
   * @returns {Insert} - New Insert instance
   */
  insertQuery() {
    const Insert = require('../sql/insert');
    return new Insert(this);
  }

  /**
   * Create a new Update query builder
   * @returns {Update} - New Update instance
   */
  updateQuery() {
    const Update = require('../sql/update');
    return new Update(this);
  }

  /**
   * Create a new Delete query builder
   * @returns {Delete} - New Delete instance
   */
  deleteQuery() {
    const Delete = require('../sql/delete');
    return new Delete(this);
  }

  /**
   * Create a new prepared statement
   * @param {string} sql - SQL query string
   * @returns {Statement} - Database-specific statement instance
   */
  prepare(sql) {
    throw new Error('prepare() must be implemented by concrete adapter class');
  }

  /**
   * Get the parameter placeholder for this database type
   * @param {number} index - Parameter index (0-based)
   * @returns {string} - Parameter placeholder
   */
  getParameterPlaceholder(index) {
    throw new Error('getParameterPlaceholder() must be implemented by concrete adapter class');
  }

  /**
   * Connect to the database
   * @returns {Promise} - Connection promise
   */
  async connect() {
    throw new Error('connect() method must be implemented by database adapter');
  }

  /**
   * Disconnect from the database
   * @returns {Promise} - Disconnection promise
   */
  async disconnect() {
    throw new Error('disconnect() method must be implemented by database adapter');
  }

  /**
   * Execute a raw SQL query with parameters
   * @param {string} sql - SQL query string
   * @param {array} params - Query parameters
   * @returns {Promise} - Query result promise
   */
  async query(sql, params = []) {
    throw new Error('query() method must be implemented by database adapter');
  }

  /**
   * Execute a SELECT query and return all rows
   * @param {string|Select} query - SQL string or Select object
   * @param {array} params - Query parameters (if using SQL string)
   * @returns {Promise<Array>} - Array of result rows
   */
  async fetchAll(query, params = []) {
    await this.ensureConnected();

    if (typeof query === 'object' && query && query.constructor && query.constructor.name === 'Select') {
      return this.query(query.toString(), query.getParameters());
    }
    return this.query(query, params);
  }

  /**
   * Execute a SELECT query and return first row
   * @param {string|Select} query - SQL string or Select object
   * @param {array} params - Query parameters (if using SQL string)
   * @returns {Promise<Object|null>} - Single result row or null
   */
  async fetchRow(query, params = []) {
    const results = await this.fetchAll(query, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Execute a SELECT query and return single value
   * @param {string|Select} query - SQL string or Select object
   * @param {array} params - Query parameters (if using SQL string)
   * @returns {Promise<*>} - Single column value
   */
  async fetchOne(query, params = []) {
    const row = await this.fetchRow(query, params);
    if (row) {
      const columns = Object.keys(row);
      return columns.length > 0 ? row[columns[0]] : null;
    }
    return null;
  }

  /**
   * Execute an INSERT statement
   * @param {string} table - Table name
   * @param {object} data - Column-value pairs to insert
   * @returns {Promise} - Insert result
   */
  async insert(table, data) {
    await this.ensureConnected();

    const columns = Object.keys(data);
    const values = Object.values(data);

    const placeholders = columns.map((_, index) => this.getParameterPlaceholder(index));
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;

    return this.query(sql, values);
  }

  /**
   * Execute an UPDATE statement
   * @param {string} table - Table name
   * @param {object} data - Column-value pairs to update
   * @param {string} where - WHERE clause condition
   * @param {array} whereParams - Parameters for WHERE clause
   * @returns {Promise} - Update result
   */
  async update(table, data, where, whereParams = []) {
    await this.ensureConnected();

    const columns = Object.keys(data);
    const values = Object.values(data);

    // Build SET clause using adapter placeholders
    const setClause = columns.map((col, index) => `${col} = ${this.getParameterPlaceholder(index)}`);

    // For WHERE placeholders:
    // - If adapter uses $n style, callers often write where as "id = $1" (existing legacy behavior).
    //   We must shift them by values.length.
    // - If adapter uses "?" style, no shifting is possible/needed; keep where unchanged.
    const p0 = this.getParameterPlaceholder(0);
    let adjustedWhere = where;

    if (typeof p0 === 'string' && p0.startsWith('$')) {
      // Replace $1, $2, ... with $<values.length + n>
      adjustedWhere = where.replace(/\$(\d+)/g, (_, nStr) => {
        const n = parseInt(nStr, 10);
        return `$${values.length + n}`;
      });
    }

    const sql = `UPDATE ${table} SET ${setClause.join(', ')} WHERE ${adjustedWhere}`;
    return this.query(sql, values.concat(whereParams));
  }

  /**
   * Execute a DELETE statement
   * @param {string} table - Table name
   * @param {string} where - WHERE clause condition
   * @param {array} whereParams - Parameters for WHERE clause
   * @returns {Promise} - Delete result
   */
  async delete(table, where, whereParams = []) {
    await this.ensureConnected();

    const sql = `DELETE FROM ${table} WHERE ${where}`;
    return this.query(sql, whereParams);
  }

  /**
   * Begin a database transaction
   * @returns {Promise} - Transaction promise
   */
  async beginTransaction() {
    await this.ensureConnected();
    return this.query('BEGIN');
  }

  /**
   * Commit current transaction
   * @returns {Promise} - Commit promise
   */
  async commit() {
    await this.ensureConnected();
    return this.query('COMMIT');
  }

  /**
   * Rollback current transaction
   * @returns {Promise} - Rollback promise
   */
  async rollback() {
    await this.ensureConnected();
    return this.query('ROLLBACK');
  }

  /**
   * Execute a callback within a transaction
   * @param {Function} callback - Async function to execute in transaction
   * @returns {Promise} - Transaction result
   */
  async transaction(callback) {
    await this.beginTransaction();
    try {
      const result = await callback(this);
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  /**
   * Escape a value for use in SQL queries
   * @param {*} value - Value to escape
   * @returns {string} - Escaped value
   */
  escape(value) {
    if (value === null || value === undefined) return 'NULL';

    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (value instanceof Date) return `'${value.toISOString()}'`;

    return `'${String(value)}'`;
  }

  /**
   * Quote an identifier (table name, column name, etc.)
   * @param {string} identifier - Identifier to quote
   * @returns {string} - Quoted identifier
   */
  quoteIdentifier(identifier) {
    // Default implementation - override in specific adapters
    return `"${identifier}"`;
  }

  /**
   * Get the last inserted ID (auto-increment value)
   * @returns {Promise} - Last insert ID
   */
  async lastInsertId() {
    throw new Error('lastInsertId() method must be implemented by database adapter');
  }

  /**
   * Get database connection information
   * @returns {object} - Connection details
   */
  getConnectionInfo() {
    return {
      type: this.constructor.name,
      connected: this.isConnected(),
      config: {
        host: this.config.host || 'unknown',
        database: this.config.database || 'unknown'
      }
    };
  }
}

module.exports = DatabaseAdapter;