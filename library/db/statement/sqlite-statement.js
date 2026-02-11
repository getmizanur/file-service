const Statement = require('../sql/statement');

/**
 * SQLite Statement Implementation
 * Handles prepared statements for SQLite using sqlite3
 */
class SQLiteStatement extends Statement {

  constructor(adapter, sql) {
    super(adapter, sql);
    this.preparedStatement = null;
    this.result = null;
    this.cursor = 0;
    this.isSelect = false;
  }

  /**
   * Prepare the SQLite statement
   * @protected
   */
  async _prepare() {
    if(!this.adapter.database) {
      throw new Error('Database not connected. Call connect() first.');
    }

    this._prepareParameters();
    this.isSelect = this.sql.trim().toUpperCase().startsWith('SELECT');

    try {
      // SQLite uses ? placeholders for parameters
      this.preparedStatement = await new Promise((resolve, reject) => {
        const stmt = this.adapter.database.prepare(this.sql, (err) => {
          if(err) {
            reject(err);
          } else {
            resolve(stmt);
          }
        });
      });

      console.log('SQLite statement prepared:', this.sql);

    } catch (error) {
      throw new Error(`SQLite statement preparation failed: ${error.message}`);
    }
  }

  /**
   * Execute the SQLite statement
   * @protected
   */
  async _execute() {
    try {
      console.log('Executing SQLite statement:', this.sql);
      if(this.parameters.length > 0) {
        console.log('Parameters:', this.parameters);
      }

      if(this.isSelect) {
        // SELECT queries
        this.result = await new Promise((resolve, reject) => {
          this.preparedStatement.all(this.parameters, (err, rows) => {
            if(err) {
              reject(err);
            } else {
              resolve(rows);
            }
          });
        });

        this.cursor = 0;
        return this._formatResult(this.result);

      } else {
        // INSERT, UPDATE, DELETE queries
        const result = await new Promise((resolve, reject) => {
          this.preparedStatement.run(this.parameters, function(err) {
            if(err) {
              reject(err);
            } else {
              resolve({
                lastID: this.lastID,
                changes: this.changes
              });
            }
          });
        });

        return {
          rowCount: result.changes,
          insertId: result.lastID,
          affectedRows: result.changes
        };
      }

    } catch (error) {
      throw new Error(`SQLite statement execution failed: ${error.message}`);
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
    if(Array.isArray(this.result)) {
      return this.result.length;
    }

    // For non-SELECT queries, we need to track this during execution
    return 0;
  }

  /**
   * Get the ID of the last inserted row
   */
  async lastInsertId() {
    // This is handled during execution for SQLite
    return null;
  }

  /**
   * Close the statement and free resources
   * @protected
   */
  async _close() {
    try {
      if(this.preparedStatement) {
        await new Promise((resolve, reject) => {
          this.preparedStatement.finalize((err) => {
            if(err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
        this.preparedStatement = null;
      }
    } catch (error) {
      console.warn('Error closing SQLite prepared statement:', error.message);
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

module.exports = SQLiteStatement;