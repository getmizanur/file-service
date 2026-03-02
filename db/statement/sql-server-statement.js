// library/db/statement/sql-server-statement.js
const Statement = require('../sql/statement');

/**
 * SQL Server Statement Implementation
 * Handles prepared statements for SQL Server using mssql
 *
 * Standardized return shape:
 *   { rows, rowCount, insertedId }
 */
class SQLServerStatement extends Statement {
  constructor(adapter, sql) {
    super(adapter, sql);
    this.request = null;
    this.result = null;
    this.cursor = 0;

    // For placeholder processing
    this._processedSql = null;
  }

  /**
   * Prepare the SQL Server statement
   * @protected
   */
  async _prepare() {
    // Prefer lazy-connect if adapter supports it
    if (this.adapter?.ensureConnected) {
      await this.adapter.ensureConnected();
    }

    if (!this.adapter?.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }

    this._prepareParameters();

    try {
      const { Request } = require('mssql');
      this.request = new Request(this.adapter.pool);

      // We will bind inputs in _execute() after SQL is processed.
      // But bind once here too (safe) for consistency.
      this._bindParams(this.request, this.parameters);

      console.log('SQL Server statement prepared:', this.sql);
    } catch (error) {
      throw new Error(`SQL Server statement preparation failed: ${error.message}`);
    }
  }

  /**
   * Execute the SQL Server statement
   * @protected
   * @returns {Promise<{rows:any[], rowCount:number, insertedId:any}>}
   */
  async _execute() {
    // Ensure connected even if _prepare() wasn't called explicitly
    if (this.adapter?.ensureConnected) {
      await this.adapter.ensureConnected();
    }

    if (!this.adapter?.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }

    try {
      console.log('Executing SQL Server statement:', this.sql);
      if (this.parameters.length > 0) {
        console.log('Parameters:', this.parameters);
      }

      // Ensure request exists
      if (!this.request) {
        const { Request } = require('mssql');
        this.request = new Request(this.adapter.pool);
      }

      // Clear previous inputs and re-bind current parameters
      this.request.parameters = {};
      this._bindParams(this.request, this.parameters);

      // Rewrite placeholders to @paramN so SQL Server understands them
      const { processedSql } = this._processPlaceholders(this.sql);
      this._processedSql = processedSql;

      this.result = await this.request.query(processedSql);
      this.cursor = 0;

      const rows = Array.isArray(this.result?.recordset) ? this.result.recordset : [];
      const rowCount = Array.isArray(this.result?.rowsAffected)
        ? (this.result.rowsAffected[0] || 0)
        : rows.length;

      const insertedId = this._extractInsertedId(rows);

      return { rows, rowCount, insertedId };
    } catch (error) {
      throw new Error(`SQL Server statement execution failed: ${error.message}`);
    }
  }

  /**
   * Fetch the next row from the result set
   */
  async fetch() {
    if (!this.result || !this.result.recordset || this.cursor >= this.result.recordset.length) {
      return null;
    }

    const row = this.result.recordset[this.cursor];
    this.cursor++;

    return this._formatSingleRow(row);
  }

  /**
   * Fetch all remaining rows from the result set
   */
  async fetchAll() {
    if (!this.result || !this.result.recordset) {
      return [];
    }

    const rows = this.result.recordset.slice(this.cursor);
    this.cursor = this.result.recordset.length;

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
    if (this.result?.rowsAffected) return this.result.rowsAffected[0] || 0;
    if (this.result?.recordset) return this.result.recordset.length;
    return 0;
  }

  /**
   * Get the ID of the last inserted row (works only if OUTPUT/SELECT is used)
   */
  async lastInsertId() {
    const rows = this.result?.recordset || [];
    return this._extractInsertedId(rows);
  }

  /**
   * Close the statement and free resources
   * @protected
   */
  async _close() {
    this.request = null;
    this.result = null;
    this.cursor = 0;
    this._processedSql = null;
  }

  /**
   * SQL Server uses @param0, @param1, etc.
   * @private
   */
  _bindParams(request, params) {
    if (!Array.isArray(params)) return;

    params.forEach((param, index) => {
      request.input(`param${index}`, param);
    });
  }

  /**
   * Rewrite placeholders:
   * - '$1, $2...' -> '@param0, @param1...'
   * - '?' -> '@param0, @param1...'
   *
   * NOTE: We bind params by index anyway (param0..paramN), so no reordering needed.
   * @private
   */
  _processPlaceholders(sqlText) {
    // Prefer $n mode if present
    if (/\$\d+/.test(sqlText)) {
      const processedSql = sqlText.replace(/\$(\d+)/g, (_, nStr) => {
        const n = parseInt(nStr, 10);
        if (!Number.isFinite(n) || n <= 0) return _;
        return `@param${n - 1}`;
      });
      return { processedSql };
    }

    // Otherwise convert ? sequentially
    let idx = 0;
    const processedSql = sqlText.replace(/\?/g, () => `@param${idx++}`);
    return { processedSql };
  }

  /**
   * Extract insertedId from OUTPUT result rows.
   * @private
   */
  _extractInsertedId(rows) {
    if (!rows || rows.length === 0) return null;

    const row = rows[0];
    if (!row || typeof row !== 'object') return null;

    // common conventions
    return (
      row.InsertedId ??
      row.insertedId ??
      row.id ??
      row.ID ??
      row.file_id ??
      row.folder_id ??
      row.user_id ??
      row.event_id ??
      row.tenant_id ??
      null
    );
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

module.exports = SQLServerStatement;