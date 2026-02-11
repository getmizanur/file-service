/**
 * MySQL Database Adapter
 * 
 * Provides MySQL-specific implementation of the DatabaseAdapter interface.
 * Includes MySQL-specific features like auto-increment handling, MySQL syntax
 * optimizations, and connection pooling.
 * 
 * Dependencies:
 * - npm install mysql2
 * 
 * @author Database Query Builder Framework
 */

const DatabaseAdapter = require('./database-adapter');
const mysql = require('mysql2/promise');

class MySQLAdapter extends DatabaseAdapter {
  /**
   * Initialize MySQL adapter
   * @param {Object} config Database configuration
   * @param {string} config.host Database host
   * @param {number} config.port Database port (default: 3306)
   * @param {string} config.database Database name
   * @param {string} config.user Username
   * @param {string} config.password Password
   * @param {Object} config.pool Pool configuration
   * @param {number} config.pool.connectionLimit Connection limit (default: 10)
   * @param {number} config.pool.acquireTimeout Acquire timeout (default: 60000)
   * @param {number} config.pool.timeout Query timeout (default: 60000)
   */
  constructor(config) {
    super();
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
    this.connected = false;
  }

  /**
   * Connect to MySQL database
   * Creates connection pool for efficient connection management
   */
  async connect() {
    try {
      this.pool = mysql.createPool(this.config);

      // Test connection
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();

      this.connected = true;
      console.log('MySQL connection pool established');
    } catch (error) {
      throw new Error(`MySQL connection failed: ${error.message}`);
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    if(this.pool) {
      await this.pool.end();
      this.pool = null;
      this.connected = false;
      console.log('MySQL connection pool closed');
    }
  }

  /**
   * Execute raw SQL query
   * @param {string} sql SQL query
   * @param {Array} params Query parameters
   * @returns {Object} Query result
   */
  async query(sql, params = []) {
    if(!this.connected) {
      throw new Error('Database not connected');
    }

    try {
      const [rows, fields] = await this.pool.execute(sql, params);
      return {
        rows: rows,
        fields: fields,
        rowCount: Array.isArray(rows) ? rows.length : rows.affectedRows,
        insertedId: rows.insertId || null
      };
    } catch (error) {
      throw new Error(`MySQL query failed: ${error.message}\nSQL: ${sql}`);
    }
  }

  /**
   * Insert record with MySQL-specific RETURNING simulation
   * @param {string} table Table name
   * @param {Object} data Data to insert
   * @returns {Object} Insert result with insertedId
   */
  async insert(table, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');

    const sql = `INSERT INTO \`${table}\` (\`${columns.join('`, `')}\`) VALUES (${placeholders})`;

    const result = await this.query(sql, values);

    // MySQL provides insertId automatically
    return {
      insertedId: result.insertedId,
      affectedRows: result.rowCount,
      success: result.rowCount > 0
    };
  }

  /**
   * Insert multiple records with batch optimization
   * @param {string} table Table name
   * @param {Array} dataArray Array of objects to insert
   * @returns {Object} Insert result
   */
  async insertBatch(table, dataArray) {
    if(!Array.isArray(dataArray) || dataArray.length === 0) {
      throw new Error('Data array must be non-empty array');
    }

    const columns = Object.keys(dataArray[0]);
    const placeholders = `(${columns.map(() => '?').join(', ')})`;
    const valuesClause = dataArray.map(() => placeholders).join(', ');

    const sql = `INSERT INTO \`${table}\` (\`${columns.join('`, `')}\`) VALUES ${valuesClause}`;

    // Flatten all values for batch insert
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
   * @param {string} table Table name
   * @param {Object} data Data to update
   * @param {string} whereClause WHERE clause
   * @param {Array} whereParams WHERE parameters
   * @returns {Object} Update result
   */
  async update(table, data, whereClause, whereParams = []) {
    const setPairs = Object.keys(data).map(key => `\`${key}\` = ?`);
    const values = Object.values(data);

    let sql = `UPDATE \`${table}\` SET ${setPairs.join(', ')}`;

    if(whereClause) {
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
   * @param {string} table Table name
   * @param {string} whereClause WHERE clause
   * @param {Array} whereParams WHERE parameters
   * @returns {Object} Delete result
   */
  async delete(table, whereClause, whereParams = []) {
    let sql = `DELETE FROM \`${table}\``;

    if(whereClause) {
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
   * @param {Function} callback Transaction callback
   * @returns {*} Transaction result
   */
  async transaction(callback) {
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      // Create temporary adapter for this transaction
      const transactionAdapter = {
        query: async (sql, params) => {
          const [rows, fields] = await connection.execute(sql, params);
          return {
            rows: rows,
            fields: fields,
            rowCount: Array.isArray(rows) ? rows.length : rows.affectedRows,
            insertedId: rows.insertId || null
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
   * @param {string} value Value to escape
   * @returns {string} Escaped value
   */
  escape(value) {
    return mysql.escape(value);
  }

  /**
   * Quote identifier (table/column name) for MySQL
   * @param {string} identifier Identifier to quote
   * @returns {string} Quoted identifier
   */
  quoteIdentifier(identifier) {
    return `\`${identifier.replace(/`/g, '``')}\``;
  }

    /**
     * Get table information
     * @param {string} tableName Table name
     * @returns {Object} Table information
     */
  async getTableInfo(tableName) {
      const sql = `
    SELECT
    COLUMN_NAME as column_name,
    DATA_TYPE as data_type,
    IS_NULLABLE as is_nullable,
    COLUMN_DEFAULT as column_default,
    EXTRA as extra
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION `;
        
      const result = await this.query(sql, [this.config.database, tableName]);
      
      return {
          tableName: tableName,
          columns: result.rows.map(col => ({
              name: col.column_name,
              type: col.data_type,
              nullable: col.is_nullable === 'YES',
              default: col.column_default,
              autoIncrement: col.extra.includes('auto_increment')
          }))
      };
  }

  /**
   * List all tables in database
   * @returns {Array} Array of table names
   */
  async listTables() {
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
   * @returns {string} MySQL version
   */
  async getVersion() {
    const result = await this.query('SELECT VERSION() as version');
    return result.rows[0].version;
  }

  /**
   * Check if table exists
   * @param {string} tableName Table name
   * @returns {boolean} True if table exists
   */
  async tableExists(tableName) {
    const sql = `
      SELECT COUNT( * ) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        `;
    
    const result = await this.query(sql, [this.config.database, tableName]);
    return result.rows[0].count > 0;
  }

  /**
   * MySQL-specific: Get auto-increment value
   * @param {string} tableName Table name
   * @returns {number} Next auto-increment value
   */
  async getNextAutoIncrement(tableName) {
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
   * @param {string} tableName Table name
   * @returns {Object} Optimization result
   */
  async optimizeTable(tableName) {
    const sql = `OPTIMIZE TABLE \`${tableName}\``;
    return await this.query(sql);
  }

  /**
   * MySQL-specific: Show table status
   * @param {string} tableName Table name
   * @returns {Object} Table status information
   */
  async showTableStatus(tableName) {
    const sql = `SHOW TABLE STATUS LIKE ?`;
    const result = await this.query(sql, [tableName]);
    return result.rows[0] || null;
  }

  /**
   * Create a new prepared statement for MySQL
   * @param {string} sql - SQL query string
   * @returns {MySQLStatement} - MySQL statement instance
   */
  prepare(sql) {
    const MySQLStatement = require('../statement/mysqlStatement');
    return new MySQLStatement(this, sql);
  }

  /**
   * Get the parameter placeholder for MySQL (?)
   * @param {number} index - Parameter index (0-based)
   * @returns {string} - Parameter placeholder
   */
  getParameterPlaceholder(index) {
    return '?';
  }
}

module.exports = MySQLAdapter;