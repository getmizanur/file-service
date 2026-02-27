// library/db/adapter/postgre-sql-adapter.js
const DatabaseAdapter = require('./database-adapter');

/**
 * PostgreSQL Database Adapter - Concrete implementation for PostgreSQL
 * Uses pg (node-postgres) library for database connectivity
 */
class PostgreSQLAdapter extends DatabaseAdapter {
  constructor(config) {
    super(config);
    this.client = null;
    this.pool = null;
  }

  /**
   * Connect to PostgreSQL database
   * Must be safe to call multiple times.
   * @returns {Promise} - Connection promise
   */
  async connect() {
    try {
      // If already connected, be idempotent
      if (this.pool) {
        return this.connection;
      }

      const { Pool } = require('pg');

      const poolConfig = {
        host: this.config.host || 'localhost',
        port: this.config.port || 5432,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        max: this.config.max_connections || 10,
        idleTimeoutMillis: this.config.idle_timeout || 30000,
        connectionTimeoutMillis: this.config.connection_timeout || 2000
      };

      this.pool = new Pool(poolConfig);

      // Prevent unhandled 'error' events from crashing the process
      // (e.g. PostgreSQL admin restart, idle connection timeout)
      this.pool.on('error', (err) => {
        console.error('[PostgreSQLAdapter] Pool idle client error:', err.message);
      });

      // Test connection (acquire one client and keep it for legacy connection checks)
      this.client = await this.pool.connect();
      this.connection = this.client;

      console.log(`Connected to PostgreSQL database: ${this.config.database}`);
      return this.connection;
    } catch (error) {
      // Ensure state isn't left half-open
      try {
        if (this.client) {
          this.client.release();
          this.client = null;
        }
        if (this.pool) {
          await this.pool.end();
          this.pool = null;
        }
      } catch (_) {
        // ignore cleanup errors
      }

      this.connection = null;
      this._markDisconnected?.();

      throw new Error(`PostgreSQL connection failed: ${error.message}`);
    }
  }

  /**
   * Disconnect from PostgreSQL database
   * @returns {Promise} - Disconnection promise
   */
  async disconnect() {
    try {
      if (this.client) {
        this.client.release();
        this.client = null;
      }

      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }

      this.connection = null;
      this._markDisconnected?.();

      console.log('Disconnected from PostgreSQL database');
    } catch (error) {
      throw new Error(`PostgreSQL disconnection failed: ${error.message}`);
    }
  }

  /**
   * Execute a raw SQL query with parameters
   * @param {string} sql - SQL query string
   * @param {array} params - Query parameters
   * @returns {Promise<{rows:any[], rowCount:number, insertedId:any}>}
   */
  async query(sql, params = []) {
    await this.ensureConnected();

    try {
      console.log('Executing SQL:', sql);
      if (params.length > 0) console.log('Parameters:', params);

      const result = await this.pool.query(sql, params);

      return {
        rows: result.rows || [],
        rowCount: typeof result.rowCount === 'number' ? result.rowCount : (result.rows ? result.rows.length : 0),
        insertedId: null // postgres doesn't expose insertId; use RETURNING if needed
      };
    } catch (error) {
      throw new Error(`PostgreSQL query failed: ${error.message}`);
    }
  }

  /**
   * Execute an INSERT statement and return inserted row
   * @param {string} table - Table name
   * @param {object} data - Column-value pairs to insert
   * @returns {Promise<object>}
   */
  async insert(table, data) {
    await this.ensureConnected();

    const columns = Object.keys(data);
    const placeholders = columns.map((_, index) => this.getParameterPlaceholder(index));
    const values = Object.values(data);

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    const result = await this.query(sql, values);

    const insertedRow = result.rows[0] || null;

    return {
      insertedId: insertedRow ? (insertedRow.id ?? null) : null,
      insertedRow,
      rowsAffected: result.rowCount,
      // MySQL adapter uses rowCount + insertedId fields; keep both
      rowCount: result.rowCount
    };
  }

  /**
   * Execute an UPDATE statement
   * @returns {Promise<object>}
   */
  async update(table, data, where, whereParams = []) {
    await this.ensureConnected();

    const columns = Object.keys(data);
    const values = Object.values(data);

    const setClause = columns.map((col, index) => `${col} = ${this.getParameterPlaceholder(index)}`);

    // Adjust WHERE placeholders ($1..) to follow after SET placeholders
    let adjustedWhere = where;
    if (typeof adjustedWhere === 'string') {
      adjustedWhere = adjustedWhere.replace(/\$(\d+)/g, (_, nStr) => {
        const n = parseInt(nStr, 10);
        return `$${values.length + n}`;
      });
    }

    const sql = `UPDATE ${table} SET ${setClause.join(', ')} WHERE ${adjustedWhere} RETURNING *`;
    const result = await this.query(sql, values.concat(whereParams));

    return {
      rowsAffected: result.rowCount,
      updatedRows: result.rows,
      rowCount: result.rowCount
    };
  }

  /**
   * Execute a DELETE statement
   * @returns {Promise<object>}
   */
  async delete(table, where, whereParams = []) {
    await this.ensureConnected();

    const sql = `DELETE FROM ${table} WHERE ${where} RETURNING *`;
    const result = await this.query(sql, whereParams);

    return {
      rowsAffected: result.rowCount,
      deletedRows: result.rows,
      rowCount: result.rowCount
    };
  }

  quoteIdentifier(identifier) {
    return `"${identifier}"`;
  }

  async lastInsertId(sequence = null) {
    await this.ensureConnected();

    if (sequence) {
      const res = await this.query('SELECT currval($1) as currval', [sequence]);
      return res.rows[0] ? res.rows[0].currval : null;
    }

    const res = await this.query('SELECT lastval() as lastval');
    return res.rows[0] ? res.rows[0].lastval : null;
  }

  async getDatabaseInfo() {
    try {
      await this.ensureConnected();

      const versionResult = await this.query('SELECT version()');
      const dbSizeResult = await this.query(
        `SELECT pg_size_pretty(pg_database_size($1)) as size`,
        [this.config.database]
      );
      const encoding = await this.query('SHOW client_encoding');

      return {
        ...this.getConnectionInfo(),
        version: versionResult.rows[0] ? versionResult.rows[0].version : 'Unknown',
        database_size: dbSizeResult.rows[0] ? dbSizeResult.rows[0].size : 'Unknown',
        client_encoding: encoding
      };
    } catch (error) {
      return {
        ...this.getConnectionInfo(),
        error: error.message
      };
    }
  }

  async tableExists(tableName) {
    await this.ensureConnected();

    const result = await this.query(
      `
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        ) as exists
      `,
      [tableName]
    );

    return result.rows[0] ? result.rows[0].exists : false;
  }

  async getTableColumns(tableName) {
    await this.ensureConnected();

    const res = await this.query(
      `
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `,
      [tableName]
    );

    return res.rows;
  }

  prepare(sql) {
    const PostgreSQLStatement = require('../statement/postgreSQLStatement');
    return new PostgreSQLStatement(this, sql);
  }

  getParameterPlaceholder(index) {
    return `$${index + 1}`;
  }
}

module.exports = PostgreSQLAdapter;