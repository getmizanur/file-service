const Statement = require('../sql/statement');

/**
 * SQLite Statement Implementation
 * Handles prepared statements for SQLite using sqlite3
 *
 * Standardized return shape:
 *   { rows, rowCount, insertedId }
 */
class SQLiteStatement extends Statement {

  constructor(adapter, sql) {
    super(adapter, sql);
    this.preparedStatement = null;
    this.result = null;
    this.cursor = 0;
    this.isSelect = false;

    // Track write metadata for rowCount()/lastInsertId()
    this._lastRowCount = 0;
    this._lastInsertedId = null;

    // For $n rewriting
    this._processedSql = null;
    this._processedParams = null;
  }

  /**
   * Get the sqlite3 database handle in a backward-compatible way.
   */
  _getDbHandle() {
    return this.adapter?.db || this.adapter?.database || this.adapter?.connection || null;
  }

  /**
   * Rewrite $1,$2,... placeholders to ? and reorder params to match appearance order.
   * SQLite does not understand PostgreSQL $n placeholders.
   */
  _rewriteDollarParams(sqlText, params) {
    if (!/\$\d+/.test(sqlText)) {
      return { sql: sqlText, params };
    }

    const order = [];
    const rewrittenSql = sqlText.replace(/\$(\d+)/g, (_, nStr) => {
      const n = parseInt(nStr, 10);
      order.push(n - 1); // $1 => index 0
      return '?';
    });

    const rewrittenParams = order.map(i => params[i]);
    return { sql: rewrittenSql, params: rewrittenParams };
  }

  /**
   * Prepare the SQLite statement
   * @protected
   */
  async _prepare() {
    // Prefer lazy-connect if adapter supports it
    if (this.adapter?.ensureConnected) {
      await this.adapter.ensureConnected();
    }

    const db = this._getDbHandle();
    if (!db) {
      throw new Error('Database not connected. Call connect() first.');
    }

    this._prepareParameters();

    // Identify SELECT / WITH / PRAGMA as "read"
    const t = this.sql.trim().toUpperCase();
    this.isSelect = t.startsWith('SELECT') || t.startsWith('WITH') || t.startsWith('PRAGMA');

    // Support $1..$n placeholders (builders emit these)
    const rewritten = this._rewriteDollarParams(this.sql, this.parameters);
    this._processedSql = rewritten.sql;
    this._processedParams = rewritten.params;

    try {
      this.preparedStatement = await new Promise((resolve, reject) => {
        const stmt = db.prepare(this._processedSql, (err) => {
          if (err) reject(err);
          else resolve(stmt);
        });
      });

      console.log('SQLite statement prepared:', this._processedSql);
    } catch (error) {
      throw new Error(`SQLite statement preparation failed: ${error.message}`);
    }
  }

  /**
   * Execute the SQLite statement
   * @protected
   * @returns {Promise<{rows:any[], rowCount:number, insertedId:any}>}
   */
  async _execute() {
    try {
      // If someone calls execute without prepare()
      if (!this.preparedStatement) {
        await this._prepare();
      }

      const sqlText = this._processedSql || this.sql;
      const params = this._processedParams || this.parameters;

      console.log('Executing SQLite statement:', sqlText);
      if (params.length > 0) {
        console.log('Parameters:', params);
      }

      // Reset last write metadata
      this._lastRowCount = 0;
      this._lastInsertedId = null;

      if (this.isSelect) {
        // SELECT queries
        const rows = await new Promise((resolve, reject) => {
          this.preparedStatement.all(params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        });

        this.result = rows;
        this.cursor = 0;

        // Standard return shape (rows should be raw objects)
        return {
          rows: rows,
          rowCount: rows.length,
          insertedId: null
        };
      }

      // INSERT, UPDATE, DELETE queries
      const writeMeta = await new Promise((resolve, reject) => {
        this.preparedStatement.run(params, function (err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });

      this.result = null;
      this.cursor = 0;

      this._lastRowCount = writeMeta.changes || 0;
      this._lastInsertedId = writeMeta.lastID || null;

      return {
        rows: [],
        rowCount: this._lastRowCount,
        insertedId: this._lastInsertedId
      };
    } catch (error) {
      throw new Error(`SQLite statement execution failed: ${error.message}`);
    }
  }

  /**
   * Fetch the next row from the result set
   */
  async fetch() {
    if (!this.result || !Array.isArray(this.result) || this.cursor >= this.result.length) {
      return null;
    }

    const row = this.result[this.cursor];
    this.cursor++;

    return this._formatSingleRow(row);
  }

  /**
   * Fetch all remaining rows from the result set
   */
  async fetchAll() {
    if (!this.result || !Array.isArray(this.result)) {
      return [];
    }

    const rows = this.result.slice(this.cursor);
    this.cursor = this.result.length;

    return this._formatResult(rows);
  }

  /**
   * Fetch a single column from the next row
   */
  async fetchColumn(columnIndex = 0) {
    const row = await this.fetch();
    if (!row) return null;

    if (Array.isArray(row)) {
      return row[columnIndex] ?? null;
    } else if (typeof row === 'object') {
      const values = Object.values(row);
      return values[columnIndex] ?? null;
    }

    return row;
  }

  /**
   * Get the number of rows affected by the last statement
   */
  async rowCount() {
    // SELECT: number of rows loaded
    if (Array.isArray(this.result)) return this.result.length;

    // Writes: changes tracked during _execute()
    return this._lastRowCount || 0;
  }

  /**
   * Get the ID of the last inserted row
   */
  async lastInsertId() {
    return this._lastInsertedId ?? null;
  }

  /**
   * Close the statement and free resources
   * @protected
   */
  async _close() {
    try {
      if (this.preparedStatement) {
        await new Promise((resolve, reject) => {
          this.preparedStatement.finalize((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        this.preparedStatement = null;
      }
    } catch (error) {
      console.warn('Error closing SQLite prepared statement:', error.message);
    }

    this.result = null;
    this.cursor = 0;
    this._lastRowCount = 0;
    this._lastInsertedId = null;
    this._processedSql = null;
    this._processedParams = null;
  }

  /**
   * Format a single row based on fetch mode
   * @private
   */
  _formatSingleRow(row) {
    if (!row) return null;

    switch (this.fetchMode) {
      case 'array':
        return Object.values(row);

      case 'column':
        return Object.values(row)[0];

      case 'object':
      default:
        return row;
    }
  }
}

module.exports = SQLiteStatement;