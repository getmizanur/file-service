const Statement = require('../sql/statement');

/**
 * SQL Server Statement Implementation
 * Handles prepared statements for SQL Server using mssql
 */
class SQLServerStatement extends Statement {

  constructor(adapter, sql) {
    super(adapter, sql);
    this.request = null;
    this.result = null;
    this.cursor = 0;
  }

  /**
   * Prepare the SQL Server statement
   * @protected
   */
  async _prepare() {
    if(!this.adapter.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }

    this._prepareParameters();

    try {
      const {
        Request
      } = require('mssql');
      this.request = new Request(this.adapter.pool);

      // SQL Server uses @param0, @param1, etc. for parameters
      this.parameters.forEach((param, index) => {
        this.request.input(`param${index}`, param);
      });

      console.log('SQL Server statement prepared:', this.sql);

    } catch (error) {
      throw new Error(`SQL Server statement preparation failed: ${error.message}`);
    }
  }

  /**
   * Execute the SQL Server statement
   * @protected
   */
  async _execute() {
    try {
      console.log('Executing SQL Server statement:', this.sql);
      if(this.parameters.length > 0) {
        console.log('Parameters:', this.parameters);
      }

      // Clear previous inputs and add current parameters
      if(this.request) {
        this.request.parameters = {};
        this.parameters.forEach((param, index) => {
          this.request.input(`param${index}`, param);
        });
      }

      this.result = await this.request.query(this.sql);
      this.cursor = 0;

      // Return appropriate result based on query type
      if(this.result.recordset) {
        return this._formatResult(this.result.recordset);
      } else {
        return {
          rowCount: this.result.rowsAffected[0] || 0,
          insertId: this._extractInsertId(),
          affectedRows: this.result.rowsAffected[0] || 0
        };
      }

    } catch (error) {
      throw new Error(`SQL Server statement execution failed: ${error.message}`);
    }
  }

  /**
   * Fetch the next row from the result set
   */
  async fetch() {
    if(!this.result || !this.result.recordset || this.cursor >= this.result.recordset.length) {
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
    if(!this.result || !this.result.recordset) {
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
    if(this.result && this.result.rowsAffected) {
      return this.result.rowsAffected[0] || 0;
    }
    if(this.result && this.result.recordset) {
      return this.result.recordset.length;
    }
    return 0;
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
    this.request = null;
    this.result = null;
    this.cursor = 0;
  }

  /**
   * Extract insert ID from SQL Server result
   * @private
   */
  _extractInsertId() {
    if(!this.result || !this.result.recordset || this.result.recordset.length === 0) {
      return null;
    }

    // If the query included OUTPUT inserted.ID or similar, get it from the result
    const row = this.result.recordset[0];
    if(row && (row.id !== undefined || row.ID !== undefined)) {
      return row.id || row.ID;
    }

    // SQL Server uses SCOPE_IDENTITY() to get last insert ID
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

module.exports = SQLServerStatement;