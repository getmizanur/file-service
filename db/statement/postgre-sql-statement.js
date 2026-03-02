// library/db/statement/postgre-sql-statement.js
const Statement = require('../sql/statement');

/**
 * PostgreSQL Statement Implementation
 * Handles prepared statements for PostgreSQL using node-postgres (pg)
 *
 * Standardized return shape:
 *   { rows, rowCount, insertedId }
 */
class PostgreSQLStatement extends Statement {
  constructor(adapter, sql) {
    super(adapter, sql);
    this.result = null;
    this.cursor = 0;
    this.preparedName = null;
  }

  /**
   * Prepare the PostgreSQL statement
   * @protected
   */
  async _prepare() {
    // Prefer lazy connect if available
    if (this.adapter?.ensureConnected) {
      await this.adapter.ensureConnected();
    }

    if (!this.adapter?.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }

    // PostgreSQL uses parameterized queries with $1, $2, etc.
    this._prepareParameters();

    // Generate unique name for prepared statement (kept for debugging/future use)
    this.preparedName = `stmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // node-postgres prepares automatically; nothing to do
      console.log('PostgreSQL statement prepared:', this.sql);
    } catch (error) {
      throw new Error(`PostgreSQL statement preparation failed: ${error.message}`);
    }
  }

  /**
   * Execute the PostgreSQL statement
   * @protected
   * @returns {Promise<{rows:any[], rowCount:number, insertedId:any}>}
   */
  async _execute() {
    // Ensure connection (covers cases where _prepare wasn't called explicitly)
    if (this.adapter?.ensureConnected) {
      await this.adapter.ensureConnected();
    }

    if (!this.adapter?.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }

    try {
      console.log('Executing PostgreSQL statement:', this.sql);
      if (this.parameters.length > 0) {
        console.log('Parameters:', this.parameters);
      }

      this.result = await this.adapter.pool.query(this.sql, this.parameters);
      this.cursor = 0;

      const rows = Array.isArray(this.result?.rows) ? this.result.rows : [];
      const rowCount =
        typeof this.result?.rowCount === 'number'
          ? this.result.rowCount
          : rows.length;

      const insertedId = this._extractInsertedIdFromRows(rows);

      return { rows, rowCount, insertedId };
    } catch (error) {
      throw new Error(`PostgreSQL statement execution failed: ${error.message}`);
    }
  }

  /**
   * Fetch the next row from the result set
   */
  async fetch() {
    if (!this.result || !this.result.rows || this.cursor >= this.result.rows.length) {
      return null;
    }

    const row = this.result.rows[this.cursor];
    this.cursor++;

    return this._formatSingleRow(row);
  }

  /**
   * Fetch all remaining rows from the result set
   */
  async fetchAll() {
    if (!this.result || !this.result.rows) {
      return [];
    }

    const rows = this.result.rows.slice(this.cursor);
    this.cursor = this.result.rows.length;

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
    if (!this.result) return 0;
    if (typeof this.result.rowCount === 'number') return this.result.rowCount;
    return Array.isArray(this.result.rows) ? this.result.rows.length : 0;
  }

  /**
   * Get the ID of the last inserted row
   * (Works only if your query uses RETURNING)
   */
  async lastInsertId() {
    const rows = this.result?.rows || [];
    return this._extractInsertedIdFromRows(rows);
  }

  /**
   * Close the statement and free resources
   * @protected
   */
  async _close() {
    this.result = null;
    this.cursor = 0;
    this.preparedName = null;
  }

  /**
   * Extract insertedId from the first returned row.
   * PostgreSQL typically requires RETURNING for this.
   * @private
   */
  _extractInsertedIdFromRows(rows) {
    if (!rows || rows.length === 0) return null;

    const row = rows[0];
    if (!row || typeof row !== 'object') return null;

    // Common identity keys across your schema
    return (
      row.id ??
      row.ID ??
      row.file_id ??
      row.folder_id ??
      row.user_id ??
      row.event_id ??
      row.share_id ??
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

module.exports = PostgreSQLStatement;