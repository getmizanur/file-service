const Statement = require('../sql/statement');

/**
 * PostgreSQL Statement Implementation
 * Handles prepared statements for PostgreSQL using node-postgres (pg)
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
    if(!this.adapter.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }

    // PostgreSQL uses parameterized queries with $1, $2, etc.
    this._prepareParameters();

    // Generate unique name for prepared statement
    this.preparedName = `stmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // PostgreSQL automatically prepares statements when executed
      // No explicit preparation needed with node-postgres
      console.log('PostgreSQL statement prepared:', this.sql);

    } catch (error) {
      throw new Error(`PostgreSQL statement preparation failed: ${error.message}`);
    }
  }

  /**
   * Execute the PostgreSQL statement
   * @protected
   */
  async _execute() {
    try {
      console.log('Executing PostgreSQL statement:', this.sql);
      if(this.parameters.length > 0) {
        console.log('Parameters:', this.parameters);
      }

      this.result = await this.adapter.pool.query(this.sql, this.parameters);
      this.cursor = 0;

      // Return appropriate result based on query type
      if(this.sql.trim().toUpperCase().startsWith('SELECT')) {
        return this._formatResult(this.result.rows);
      } else {
        return {
          rowCount: this.result.rowCount,
          insertId: this._extractInsertId(),
          affectedRows: this.result.rowCount
        };
      }

    } catch (error) {
      throw new Error(`PostgreSQL statement execution failed: ${error.message}`);
    }
  }

  /**
   * Fetch the next row from the result set
   */
  async fetch() {
    if(!this.result || !this.result.rows || this.cursor >= this.result.rows.length) {
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
    if(!this.result || !this.result.rows) {
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
    if(!row) {
      return null;
    }

    if(Array.isArray(row)) {
      return row[columnIndex] || null;
    } else if(typeof row === 'object') {
      const values = Object.values(row);
      return values[columnIndex] || null;
    }

    return row;
  }

  /**
   * Get the number of rows affected by the last statement
   */
  async rowCount() {
    return this.result ? this.result.rowCount : 0;
  }

  /**
   * Get the ID of the last inserted row
   */
  async lastInsertId() {
    return this._extractInsertId();
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
   * Extract insert ID from PostgreSQL result
   * @private
   */
  _extractInsertId() {
    if(!this.result || !this.result.rows || this.result.rows.length === 0) {
      return null;
    }

    // If the query included RETURNING id, get it from the result
    const row = this.result.rows[0];
    if(row && (row.id !== undefined || row.ID !== undefined)) {
      return row.id || row.ID;
    }

    // PostgreSQL doesn't have auto-increment like MySQL, use RETURNING clause
    return null;
  }

  /**
   * Format a single row based on fetch mode
   * @param {Object} row - Database row
   * @returns {*} - Formatted row
   * @private
   */
  _formatSingleRow(row) {
    if(!row) {
      return null;
    }

    switch(this.fetchMode) {
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