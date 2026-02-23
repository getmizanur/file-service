// library/db/adapter/mysql-adapter.js
/**
 * MySQL Database Adapter
 *
 * Provides MySQL-specific implementation of the DatabaseAdapter interface.
 *
 * Dependencies:
 * - npm install mysql2
 */

const DatabaseAdapter = require('./database-adapter');
const mysql = require('mysql2/promise');

class MySQLAdapter extends DatabaseAdapter {
  /**
   * Initialize MySQL adapter
   * @param {Object} config Database configuration
   */
  constructor(config) {
    // IMPORTANT: pass config up so base adapter can expose it via getConnectionInfo()
    super(config);

    // keep your existing normalized config shape
    this.config = {
      host: config.host || 'localhost',
      port: config.port || 3306,
      database: config.database,
      user: config.user,
      password: config.password,
      connectionLimit: config.pool?.connectionLimit || 10,
      acquireTimeout: config.pool?.acquireTimeout || 60000,
      timeout: config.pool?.timeout || 60000,
      charset: 'utf8mb4',
      timezone: 'Z'
    };

    this.pool = null;

    // keep legacy flag, but ensureConnected() will also manage base state
    this.connected = false;
  }

  /**
   * Connect to MySQL database (idempotent)
   * Creates connection pool for efficient connection management
   */
  async connect() {
    try {
      // Idempotent: if pool exists and we think we're connected, do nothing
      if (this.pool && this.connected) {
        // also keep base in sync
        this.connection = this.pool;
        return;
      }

      if (!this.pool) {
        this.pool = mysql.createPool(this.config);
      }

      // Test connection
      const connection = await this.pool.getConnection();
      try {
        await connection.ping();
      } finally {
        connection.release();
      }

      this.connected = true;
      this.connection = this.pool; // allow base isConnected() heuristic to work too

      console.log('MySQL connection pool established');
    } catch (error) {
      // cleanup in case pool got created but isn't usable
      try {
        if (this.pool) {
          await this.pool.end();
        }
      } catch (_) {
        // ignore cleanup errors
      }

      this.pool = null;
      this.connected = false;
      this.connection = null;
      this._markDisconnected?.();

      throw new Error(`MySQL connection failed: ${error.message}`);
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }

    this.connected = false;
    this.connection = null;

    this._markDisconnected?.();

    console.log('MySQL connection pool closed');
  }

  /**
   * Execute raw SQL query
   * @param {string} sql SQL query
   * @param {Array} params Query parameters
   * @returns {Object} Query result
   */
  async query(sql, params = []) {
    // NEW: lazy-connect
    await this.ensureConnected();

    try {
      const [rows, fields] = await this.pool.execute(sql, params);

      return {
        rows: rows,
        fields: fields,
        rowCount: Array.isArray(rows) ? rows.length : rows.affectedRows,
        insertedId: rows && typeof rows === 'object' ? (rows.insertId || null) : null
      };
    } catch (error) {
      throw new Error(`MySQL query failed: ${error.message}\nSQL: ${sql}`);
    }
  }

  /**
   * Insert record with MySQL-specific RETURNING simulation
   */
  async insert(table, data) {
    await this.ensureConnected();

    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');

    const sql = `INSERT INTO \`${table}\` (\`${columns.join('`, `')}\`) VALUES (${placeholders})`;

    const result = await this.query(sql, values);

    return {
      insertedId: result.insertedId,
      affectedRows: result.rowCount,
      success: result.rowCount > 0
    };
  }

  /**
   * Insert multiple records with batch optimization
   */
  async insertBatch(table, dataArray) {
    await this.ensureConnected();

    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      throw new Error('Data array must be non-empty array');
    }

    const columns = Object.keys(dataArray[0]);
    const placeholders = `(${columns.map(() => '?').join(', ')})`;
    const valuesClause = dataArray.map(() => placeholders).join(', ');

    const sql = `INSERT INTO \`${table}\` (\`${columns.join('`, `')}\`) VALUES ${valuesClause}`;

    const allValues = dataArray.flatMap(obj => Object.values(obj));
    const result = await this.query(sql, allValues);

    return {
      insertedCount: result.rowCount,
      firstInsertedId: result.insertedId,
      success: result.rowCount > 0
    };
  }

  /**
   * Update records
   */
  async update(table, data, whereClause, whereParams = []) {
    await this.ensureConnected();

    const setPairs = Object.keys(data).map(key => `\`${key}\` = ?`);
    const values = Object.values(data);

    let sql = `UPDATE \`${table}\` SET ${setPairs.join(', ')}`;

    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
      values.push(...whereParams);
    }

    const result = await this.query(sql, values);

    return {
      affectedRows: result.rowCount,
      success: result.rowCount > 0
    };
  }

  /**
   * Delete records
   */
  async delete(table, whereClause, whereParams = []) {
    await this.ensureConnected();

    let sql = `DELETE FROM \`${table}\``;
    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
    }

    const result = await this.query(sql, whereParams);

    return {
      affectedRows: result.rowCount,
      success: result.rowCount > 0
    };
  }

  /**
   * Execute transaction
   */
  async transaction(callback) {
    await this.ensureConnected();

    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      // Transaction-scoped adapter that matches your query() return shape
      const transactionAdapter = {
        query: async (sql, params = []) => {
          const [rows, fields] = await connection.execute(sql, params);
          return {
            rows: rows,
            fields: fields,
            rowCount: Array.isArray(rows) ? rows.length : rows.affectedRows,
            insertedId: rows && typeof rows === 'object' ? (rows.insertId || null) : null
          };
        }
      };

      const result = await callback(transactionAdapter);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Escape string value for MySQL
   */
  escape(value) {
    return mysql.escape(value);
  }

  /**
   * Quote identifier (table/column name) for MySQL
   */
  quoteIdentifier(identifier) {
    return `\`${identifier.replace(/`/g, '``')}\``;
  }

  /**
   * Get table information
   */
  async getTableInfo(tableName) {
    await this.ensureConnected();

    const sql = `
      SELECT
        COLUMN_NAME as column_name,
        DATA_TYPE as data_type,
        IS_NULLABLE as is_nullable,
        COLUMN_DEFAULT as column_default,
        EXTRA as extra
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `;

    const result = await this.query(sql, [this.config.database, tableName]);

    return {
      tableName: tableName,
      columns: result.rows.map(col => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        default: col.column_default,
        autoIncrement: String(col.extra || '').includes('auto_increment')
      }))
    };
  }

  /**
   * List all tables in database
   */
  async listTables() {
    await this.ensureConnected();

    const sql = `
      SELECT TABLE_NAME as table_name
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `;

    const result = await this.query(sql, [this.config.database]);
    return result.rows.map(row => row.table_name);
  }

  /**
   * Get MySQL version
   */
  async getVersion() {
    await this.ensureConnected();

    const result = await this.query('SELECT VERSION() as version');
    return result.rows[0].version;
  }

  /**
   * Check if table exists
   */
  async tableExists(tableName) {
    await this.ensureConnected();

    const sql = `
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    `;

    const result = await this.query(sql, [this.config.database, tableName]);
    return result.rows[0].count > 0;
  }

  /**
   * MySQL-specific: Get auto-increment value
   */
  async getNextAutoIncrement(tableName) {
    await this.ensureConnected();

    const sql = `
      SELECT AUTO_INCREMENT as next_id
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    `;

    const result = await this.query(sql, [this.config.database, tableName]);
    return result.rows[0]?.next_id || 1;
  }

  /**
   * MySQL-specific: Optimize table
   */
  async optimizeTable(tableName) {
    await this.ensureConnected();

    const sql = `OPTIMIZE TABLE \`${tableName}\``;
    return await this.query(sql);
  }

  /**
   * MySQL-specific: Show table status
   */
  async showTableStatus(tableName) {
    await this.ensureConnected();

    const sql = `SHOW TABLE STATUS LIKE ?`;
    const result = await this.query(sql, [tableName]);
    return result.rows[0] || null;
  }

  /**
   * Create a new prepared statement for MySQL
   */
  prepare(sql) {
    const MySQLStatement = require('../statement/mysqlStatement');
    return new MySQLStatement(this, sql);
  }

  /**
   * Get the parameter placeholder for MySQL (?)
   */
  getParameterPlaceholder(index) {
    return '?';
  }
}

module.exports = MySQLAdapter;