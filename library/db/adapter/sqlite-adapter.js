/**
 * SQLite Database Adapter
 * 
 * Provides SQLite-specific implementation of the DatabaseAdapter interface.
 * Includes SQLite-specific features like file-based storage, WAL mode support,
 * and pragma optimization settings.
 * 
 * Dependencies:
 * - npm install sqlite3
 * 
 * @author Database Query Builder Framework
 */

const DatabaseAdapter = require('./database-adapter');
const sqlite3 = require('sqlite3').verbose();

class SQLiteAdapter extends DatabaseAdapter {
  /**
   * Initialize SQLite adapter
   * @param {Object} config Database configuration
   * @param {string} config.database Database file path (e.g., './database.sqlite' or ':memory:')
   * @param {Object} config.options SQLite options
   * @param {boolean} config.options.enableWAL Enable WAL mode (default: true)
   * @param {number} config.options.busyTimeout Busy timeout in milliseconds (default: 10000)
   * @param {number} config.options.cacheSize Cache size in pages (default: -2000)
   * @param {boolean} config.options.foreignKeys Enable foreign key constraints (default: true)
   * @param {string} config.options.tempStore Temporary store location (default: 'MEMORY')
   */
  constructor(config) {
    super();
    this.config = {
      database: config.database || ':memory:',
      options: {
        enableWAL: config.options?.enableWAL !== false,
        busyTimeout: config.options?.busyTimeout || 10000,
        cacheSize: config.options?.cacheSize || -2000,
        foreignKeys: config.options?.foreignKeys !== false,
        tempStore: config.options?.tempStore || 'MEMORY',
        synchronous: config.options?.synchronous || 'NORMAL'
      }
    };
    this.db = null;
    this.connected = false;
  }

  /**
   * Connect to SQLite database
   * Creates database file if it doesn't exist and applies optimization settings
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.db = new sqlite3.Database(this.config.database, (err) => {
          if(err) {
            reject(new Error(`SQLite connection failed: ${err.message}`));
            return;
          }

          // Apply optimization pragmas
          this._applyPragmas()
            .then(() => {
              this.connected = true;
              console.log(`SQLite connected: ${this.config.database}`);
              resolve();
            })
            .catch(reject);
        });
      } catch (error) {
        reject(new Error(`SQLite initialization failed: ${error.message}`));
      }
    });
  }

  /**
   * Apply SQLite PRAGMA settings for optimization
   */
  async _applyPragmas() {
    const pragmas = [
      `PRAGMA foreign_keys = ${this.config.options.foreignKeys ? 'ON' : 'OFF'}`,
      `PRAGMA busy_timeout = ${this.config.options.busyTimeout}`,
      `PRAGMA cache_size = ${this.config.options.cacheSize}`,
      `PRAGMA temp_store = ${this.config.options.tempStore}`,
      `PRAGMA synchronous = ${this.config.options.synchronous}`
    ];

    // Enable WAL mode if requested (better for concurrent access)
    if(this.config.options.enableWAL) {
      pragmas.push('PRAGMA journal_mode = WAL');
    }

    for(const pragma of pragmas) {
      await this.query(pragma);
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    return new Promise((resolve, reject) => {
      if(this.db) {
        this.db.close((err) => {
          if(err) {
            reject(new Error(`SQLite disconnect failed: ${err.message}`));
          } else {
            this.db = null;
            this.connected = false;
            console.log('SQLite connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
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

    return new Promise((resolve, reject) => {
      try {
        // Determine if it's a SELECT query or modification query
        const isSelect = sql.trim().toUpperCase().startsWith('SELECT');

        if(isSelect) {
          this.db.all(sql, params, (err, rows) => {
            if(err) {
              reject(new Error(`SQLite query failed: ${err.message}\nSQL: ${sql}`));
            } else {
              resolve({
                rows: rows || [],
                rowCount: rows ? rows.length : 0,
                insertedId: null
              });
            }
          });
        } else {
          this.db.run(sql, params, function(err) {
            if(err) {
              reject(new Error(`SQLite query failed: ${err.message}\nSQL: ${sql}`));
            } else {
              resolve({
                rows: [],
                rowCount: this.changes || 0,
                insertedId: this.lastID || null
              });
            }
          });
        }
      } catch (error) {
        reject(new Error(`SQLite query execution failed: ${error.message}`));
      }
    });
  }

  /**
   * Insert record with automatic ID return
   * @param {string} table Table name
   * @param {Object} data Data to insert
   * @returns {Object} Insert result with insertedId
   */
  async insert(table, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');

    const sql = `INSERT INTO "${table}" ("${columns.join('", "')}") VALUES (${placeholders})`;

    const result = await this.query(sql, values);

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

    // SQLite doesn't support multi-value INSERT, so we use a transaction
    return await this.transaction(async (trx) => {
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT INTO "${table}" ("${columns.join('", "')}") VALUES (${placeholders})`;

      let insertedCount = 0;
      let firstInsertedId = null;

      for(const row of dataArray) {
        const values = columns.map(col => row[col]);
        const result = await trx.query(sql, values);

        if(result.insertedId && !firstInsertedId) {
          firstInsertedId = result.insertedId;
        }
        insertedCount += result.rowCount;
      }

      return {
        insertedCount: insertedCount,
        firstInsertedId: firstInsertedId,
        success: insertedCount > 0
      };
    });
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
    const setPairs = Object.keys(data).map(key => `"${key}" = ?`);
    const values = Object.values(data);

    let sql = `UPDATE "${table}" SET ${setPairs.join(', ')}`;

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
    let sql = `DELETE FROM "${table}"`;

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
    await this.query('BEGIN TRANSACTION');

    try {
      // Create temporary adapter for this transaction
      const transactionAdapter = {
        query: async (sql, params) => {
          return await this.query(sql, params);
        }
      };

      const result = await callback(transactionAdapter);
      await this.query('COMMIT');

      return result;
    } catch (error) {
      await this.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Escape string value for SQLite
   * @param {string} value Value to escape
   * @returns {string} Escaped value
   */
  escape(value) {
    if(typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    return value;
  }

  /**
   * Quote identifier (table/column name) for SQLite
   * @param {string} identifier Identifier to quote
   * @returns {string} Quoted identifier
   */
  quoteIdentifier(identifier) {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  /**
   * Get table information
   * @param {string} tableName Table name
   * @returns {Object} Table information
   */
  async getTableInfo(tableName) {
    const sql = `PRAGMA table_info("${tableName}")`;
    const result = await this.query(sql);

    return {
      tableName: tableName,
      columns: result.rows.map(col => ({
        name: col.name,
        type: col.type,
        nullable: !col.notnull,
        default: col.dflt_value,
        primaryKey: col.pk === 1
      }))
    };
  }

  /**
   * List all tables in database
   * @returns {Array} Array of table names
   */
  async listTables() {
    const sql = `
            SELECT name as table_name 
            FROM sqlite_master 
            WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        `;

    const result = await this.query(sql);
    return result.rows.map(row => row.table_name);
  }

  /**
   * Get SQLite version
   * @returns {string} SQLite version
   */
  async getVersion() {
    const result = await this.query('SELECT sqlite_version() as version');
    return result.rows[0].version;
  }

  /**
   * Check if table exists
   * @param {string} tableName Table name
   * @returns {boolean} True if table exists
   */
  async tableExists(tableName) {
    const sql = `
            SELECT COUNT(*) as count 
            FROM sqlite_master 
            WHERE type = 'table' AND name = ?
        `;

    const result = await this.query(sql, [tableName]);
    return result.rows[0].count > 0;
  }

  /**
   * SQLite-specific: Get database file size
   * @returns {Object} Database size information
   */
  async getDatabaseSize() {
    const result = await this.query('PRAGMA page_count');
    const pageCount = result.rows[0].page_count;

    const pageSizeResult = await this.query('PRAGMA page_size');
    const pageSize = pageSizeResult.rows[0].page_size;

    const sizeBytes = pageCount * pageSize;

    return {
      pageCount: pageCount,
      pageSize: pageSize,
      sizeBytes: sizeBytes,
      sizeMB: Math.round(sizeBytes / (1024 * 1024) * 100) / 100
    };
  }

  /**
   * SQLite-specific: Vacuum database to reclaim space
   * @returns {Object} Vacuum result
   */
  async vacuum() {
    const sizeBefore = await this.getDatabaseSize();
    await this.query('VACUUM');
    const sizeAfter = await this.getDatabaseSize();

    return {
      sizeBefore: sizeBefore.sizeMB,
      sizeAfter: sizeAfter.sizeMB,
      spaceReclaimed: sizeBefore.sizeMB - sizeAfter.sizeMB
    };
  }

  /**
   * SQLite-specific: Analyze database for optimization
   * @returns {void}
   */
  async analyze() {
    await this.query('ANALYZE');
  }

  /**
   * SQLite-specific: Get database integrity check
   * @returns {boolean} True if database is intact
   */
  async integrityCheck() {
    const result = await this.query('PRAGMA integrity_check');
    return result.rows[0].integrity_check === 'ok';
  }

  /**
   * SQLite-specific: Create index
   * @param {string} indexName Index name
   * @param {string} tableName Table name
   * @param {Array} columns Column names
   * @param {boolean} unique Whether index should be unique
   * @returns {Object} Index creation result
   */
  async createIndex(indexName, tableName, columns, unique = false) {
    const uniqueKeyword = unique ? 'UNIQUE ' : '';
    const columnList = columns.map(col => `"${col}"`).join(', ');

    const sql = `CREATE ${uniqueKeyword}INDEX IF NOT EXISTS "${indexName}" ON "${tableName}" (${columnList})`;

    const result = await this.query(sql);
    return {
      success: true,
      indexName: indexName,
      tableName: tableName,
      columns: columns
    };
  }

  /**
   * SQLite-specific: Drop index
   * @param {string} indexName Index name
   * @returns {Object} Index drop result
   */
  async dropIndex(indexName) {
    const sql = `DROP INDEX IF EXISTS "${indexName}"`;
    await this.query(sql);

    return {
      success: true,
      indexName: indexName
    };
  }

  /**
   * SQLite-specific: List all indexes
   * @returns {Array} Array of index information
   */
  async listIndexes() {
    const sql = `
            SELECT name, tbl_name, sql 
            FROM sqlite_master 
            WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        `;

    const result = await this.query(sql);
    return result.rows;
  }

  /**
   * Create a new prepared statement for SQLite
   * @param {string} sql - SQL query string
   * @returns {SQLiteStatement} - SQLite statement instance
   */
  prepare(sql) {
    const SQLiteStatement = require('../statement/sqliteStatement');
    return new SQLiteStatement(this, sql);
  }

  /**
   * Get the parameter placeholder for SQLite (?)
   * @param {number} index - Parameter index (0-based)
   * @returns {string} - Parameter placeholder
   */
  getParameterPlaceholder(index) {
    return '?';
  }
}

module.exports = SQLiteAdapter;