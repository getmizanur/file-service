// library/db/adapter/sqlite-adapter.js
/**
 * SQLite Database Adapter
 *
 * Provides SQLite-specific implementation of the DatabaseAdapter interface.
 *
 * Dependencies:
 * - npm install sqlite3
 */

const DatabaseAdapter = require('./database-adapter');
const sqlite3 = require('sqlite3').verbose();

class SQLiteAdapter extends DatabaseAdapter {
  /**
   * @param {Object} config
   * @param {string} config.database Database file path (e.g., './database.sqlite' or ':memory:')
   * @param {Object} config.options SQLite options
   */
  constructor(config = {}) {
    // IMPORTANT: pass config to base adapter so getConnectionInfo() works
    super(config);

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

    // keep base heuristic in sync
    this.connection = null;
  }

  /**
   * Connect to SQLite database (idempotent)
   */
  async connect() {
    if (this.connected && this.db) {
      this.connection = this.db;
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.db = new sqlite3.Database(this.config.database, (err) => {
          if (err) {
            reject(new Error(`SQLite connection failed: ${err.message}`));
            return;
          }

          this.connection = this.db;

          this._applyPragmas()
            .then(() => {
              this.connected = true;
              console.log(`SQLite connected: ${this.config.database}`);
              resolve();
            })
            .catch((e) => {
              try {
                this.db.close(() => {});
              } catch (_) {}
              this.db = null;
              this.connection = null;
              this.connected = false;
              this._markDisconnected?.();
              reject(e);
            });
        });
      } catch (error) {
        this.db = null;
        this.connection = null;
        this.connected = false;
        this._markDisconnected?.();
        reject(new Error(`SQLite initialization failed: ${error.message}`));
      }
    });
  }

  /**
   * Apply SQLite PRAGMA settings for optimization.
   * Uses _execPragma() to avoid calling query() (which calls ensureConnected()) during connect.
   */
  async _applyPragmas() {
    const pragmas = [
      `PRAGMA foreign_keys = ${this.config.options.foreignKeys ? 'ON' : 'OFF'}`,
      `PRAGMA busy_timeout = ${this.config.options.busyTimeout}`,
      `PRAGMA cache_size = ${this.config.options.cacheSize}`,
      `PRAGMA temp_store = ${this.config.options.tempStore}`,
      `PRAGMA synchronous = ${this.config.options.synchronous}`
    ];

    if (this.config.options.enableWAL) {
      pragmas.push('PRAGMA journal_mode = WAL');
    }

    for (const pragma of pragmas) {
      await this._execPragma(pragma);
    }
  }

  /**
   * Execute PRAGMA statement directly against db connection without triggering ensureConnected recursion.
   */
  async _execPragma(sql) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('SQLite db handle not initialized'));
        return;
      }

      this.db.all(sql, [], (err, rows) => {
        if (err) reject(new Error(`SQLite PRAGMA failed: ${err.message}\nSQL: ${sql}`));
        else resolve(rows || []);
      });
    });
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(new Error(`SQLite disconnect failed: ${err.message}`));
          } else {
            this.db = null;
            this.connected = false;
            this.connection = null;
            this._markDisconnected?.();
            console.log('SQLite connection closed');
            resolve();
          }
        });
      } else {
        this.connected = false;
        this.connection = null;
        this._markDisconnected?.();
        resolve();
      }
    });
  }

  /**
   * If SQL contains $1,$2,... placeholders, rewrite them to ? and reorder params accordingly.
   * SQLite only supports ? / ?NNN / :name placeholders (not $1 like PostgreSQL).
   *
   * Example:
   *   sql: "WHERE a = $2 AND b = $1"
   *   params: [p1, p2]
   *   => sql: "WHERE a = ? AND b = ?"
   *      params: [p2, p1]
   */
  _rewriteDollarParams(sql, params) {
    if (!/\$\d+/.test(sql)) return { sql, params };

    const order = [];
    const rewrittenSql = sql.replace(/\$(\d+)/g, (_, nStr) => {
      const n = parseInt(nStr, 10);
      order.push(n - 1); // $1 -> index 0
      return '?';
    });

    const rewrittenParams = order.map(i => params[i]);
    return { sql: rewrittenSql, params: rewrittenParams };
  }

  /**
   * Execute raw SQL query
   * @param {string} sql SQL query
   * @param {Array} params Query parameters
   * @returns {Promise<{rows:any[], rowCount:number, insertedId:any}>}
   */
  async query(sql, params = []) {
    await this.ensureConnected();

    // Support builders that emit $1..$n
    const rewritten = this._rewriteDollarParams(sql, params);
    sql = rewritten.sql;
    params = rewritten.params;

    return new Promise((resolve, reject) => {
      try {
        const trimmed = sql.trim().toUpperCase();

        const isSelectLike =
          trimmed.startsWith('SELECT') ||
          trimmed.startsWith('PRAGMA') ||
          trimmed.startsWith('WITH');

        if (isSelectLike) {
          this.db.all(sql, params, (err, rows) => {
            if (err) {
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
          this.db.run(sql, params, function runCb(err) {
            if (err) {
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
   */
  async insert(table, data) {
    await this.ensureConnected();

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
   * Insert multiple records with batch optimization (transaction)
   */
  async insertBatch(table, dataArray) {
    await this.ensureConnected();

    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      throw new Error('Data array must be non-empty array');
    }

    const columns = Object.keys(dataArray[0]);

    return await this.transaction(async (trx) => {
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT INTO "${table}" ("${columns.join('", "')}") VALUES (${placeholders})`;

      let insertedCount = 0;
      let firstInsertedId = null;

      for (const row of dataArray) {
        const values = columns.map(col => row[col]);
        const result = await trx.query(sql, values);

        if (result.insertedId && !firstInsertedId) firstInsertedId = result.insertedId;
        insertedCount += result.rowCount;
      }

      return {
        insertedCount,
        firstInsertedId,
        success: insertedCount > 0
      };
    });
  }

  /**
   * Update records
   */
  async update(table, data, whereClause, whereParams = []) {
    await this.ensureConnected();

    const setPairs = Object.keys(data).map(key => `"${key}" = ?`);
    const values = Object.values(data);

    let sql = `UPDATE "${table}" SET ${setPairs.join(', ')}`;

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

    let sql = `DELETE FROM "${table}"`;

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

    await this.query('BEGIN TRANSACTION');

    try {
      const transactionAdapter = {
        query: async (sql, params = []) => {
          // Use same query path so $1 rewriting works in transactions too
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

  escape(value) {
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    return value;
  }

  quoteIdentifier(identifier) {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  async getTableInfo(tableName) {
    await this.ensureConnected();

    const sql = `PRAGMA table_info("${tableName}")`;
    const result = await this.query(sql);

    return {
      tableName,
      columns: result.rows.map(col => ({
        name: col.name,
        type: col.type,
        nullable: !col.notnull,
        default: col.dflt_value,
        primaryKey: col.pk === 1
      }))
    };
  }

  async listTables() {
    await this.ensureConnected();

    const sql = `
      SELECT name as table_name
      FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `;

    const result = await this.query(sql);
    return result.rows.map(row => row.table_name);
  }

  async getVersion() {
    await this.ensureConnected();

    const result = await this.query('SELECT sqlite_version() as version');
    return result.rows[0].version;
  }

  async tableExists(tableName) {
    await this.ensureConnected();

    const sql = `
      SELECT COUNT(*) as count
      FROM sqlite_master
      WHERE type = 'table' AND name = ?
    `;

    const result = await this.query(sql, [tableName]);
    return result.rows[0].count > 0;
  }

  async getDatabaseSize() {
    await this.ensureConnected();

    const result = await this.query('PRAGMA page_count');
    const pageCount = result.rows[0].page_count;

    const pageSizeResult = await this.query('PRAGMA page_size');
    const pageSize = pageSizeResult.rows[0].page_size;

    const sizeBytes = pageCount * pageSize;

    return {
      pageCount,
      pageSize,
      sizeBytes,
      sizeMB: Math.round(sizeBytes / (1024 * 1024) * 100) / 100
    };
  }

  async vacuum() {
    await this.ensureConnected();

    const sizeBefore = await this.getDatabaseSize();
    await this.query('VACUUM');
    const sizeAfter = await this.getDatabaseSize();

    return {
      sizeBefore: sizeBefore.sizeMB,
      sizeAfter: sizeAfter.sizeMB,
      spaceReclaimed: sizeBefore.sizeMB - sizeAfter.sizeMB
    };
  }

  async analyze() {
    await this.ensureConnected();
    await this.query('ANALYZE');
  }

  async integrityCheck() {
    await this.ensureConnected();

    const result = await this.query('PRAGMA integrity_check');
    return result.rows[0].integrity_check === 'ok';
  }

  async createIndex(indexName, tableName, columns, unique = false) {
    await this.ensureConnected();

    const uniqueKeyword = unique ? 'UNIQUE ' : '';
    const columnList = columns.map(col => `"${col}"`).join(', ');
    const sql = `CREATE ${uniqueKeyword}INDEX IF NOT EXISTS "${indexName}" ON "${tableName}" (${columnList})`;

    await this.query(sql);

    return { success: true, indexName, tableName, columns };
  }

  async dropIndex(indexName) {
    await this.ensureConnected();

    const sql = `DROP INDEX IF EXISTS "${indexName}"`;
    await this.query(sql);

    return { success: true, indexName };
  }

  async listIndexes() {
    await this.ensureConnected();

    const sql = `
      SELECT name, tbl_name, sql
      FROM sqlite_master
      WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `;

    const result = await this.query(sql);
    return result.rows;
  }

  prepare(sql) {
    const SQLiteStatement = require('../statement/sqliteStatement');
    return new SQLiteStatement(this, sql);
  }

  getParameterPlaceholder(index) {
    return '?';
  }
}

module.exports = SQLiteAdapter;