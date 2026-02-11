const Statement = require('../sql/statement');

/**
 * MySQL Statement Implementation
 * Handles prepared statements for MySQL using mysql2
 */
class MySQLStatement extends Statement {

  constructor(adapter, sql) {
    super(adapter, sql);
    this.preparedStatement = null;
    this.result = null;
    this.cursor = 0;
  }

  /**
   * Prepare the MySQL statement
   * @protected
   */
  async _prepare() {
    if(!this.adapter.connection) {
      throw new Error('Database not connected. Call connect() first.');
    }

    this._prepareParameters();

    try {
      // MySQL uses ? placeholders for parameters
      this.preparedStatement = await this.adapter.connection.promise().prepare(this.sql);
      console.log('MySQL statement prepared:', this.sql);

    } catch (error) {
      throw new Error(`MySQL statement preparation failed: ${error.message}`);
    }
  }

  /**
   * Execute the MySQL statement
   * @protected
   */
  async _execute() {
    try {
      console.log('Executing MySQL statement:', this.sql);
      if(this.parameters.length > 0) {
        console.log('Parameters:', this.parameters);
      }

      let result;
      if(this.preparedStatement) {
        [result] = await this.preparedStatement.execute(this.parameters);
      } else {
        // Fallback to direct execution
        [result] = await this.adapter.connection.promise().execute(this.sql, this.parameters);
      }

      this.result = result;
      this.cursor = 0;

      // Return appropriate result based on query type
      if(Array.isArray(result)) {
        return this._formatResult(result);
      } else {
        return {
          rowCount: result.affectedRows || 0,
          insertId: result.insertId || null,
          affectedRows: result.affectedRows || 0
        };
      }

    } catch (error) {
      throw new Error(`MySQL statement execution failed: ${error.message}`);
    }
  }

  /**
   * Fetch the next row from the result set
   */
  async fetch() {
    if(!this.result || !Array.isArray(this.result) || this.cursor >= this.result.length) {
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
    if(!this.result || !Array.isArray(this.result)) {
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
    if(this.result && typeof this.result === 'object' && !Array.isArray(this.result)) {
      return this.result.affectedRows || 0;
    }
    return Array.isArray(this.result) ? this.result.length : 0;
  }

  /**
   * Get the ID of the last inserted row
   */
  async lastInsertId() {
    if(this.result && typeof this.result === 'object' && !Array.isArray(this.result)) {
      return this.result.insertId || null;
    }
    return null;
  }

  /**
   * Close the statement and free resources
   * @protected
   */
  async _close() {
    try {
      if(this.preparedStatement) {
        await this.preparedStatement.close();
        this.preparedStatement = null;
      }
    } catch (error) {
      console.warn('Error closing MySQL prepared statement:', error.message);
    }

    this.result = null;
    this.cursor = 0;
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

module.exports = MySQLStatement;