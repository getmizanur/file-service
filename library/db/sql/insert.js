/**
 * Insert Query Builder
 * 
 * Provides a fluent interface for constructing INSERT queries safely and efficiently.
 * Supports single and batch inserts, ON CONFLICT/DUPLICATE KEY handling, and
 * database-specific features like RETURNING clauses.
 * 
 * @author Database Query Builder Framework
 */

class Insert {
  /**
   * Initialize Insert query builder
   * @param {DatabaseAdapter} adapter - Database adapter instance
   */
  constructor(adapter) {
    this.adapter = adapter;
    this.query = {
      table: null,
      columns: [],
      values: [],
      onConflict: null,
      returning: []
    };
    this.parameters = [];
  }

  /**
   * Set target table for insert
   * @param {string} table - Table name
   * @returns {Insert} - Fluent interface
   */
  into(table) {
    this.query.table = table;
    return this;
  }

  /**
   * Set columns for insert
   * @param {Array} columns - Column names
   * @returns {Insert} - Fluent interface
   */
  columns(columns) {
    this.query.columns = Array.isArray(columns) ? columns : [columns];
    return this;
  }

  /**
   * Add single row values
   * @param {Object|Array} data - Values as object or array
   * @returns {Insert} - Fluent interface
   */
  values(data) {
    if (Array.isArray(data)) {
      // Array of values
      this.query.values.push(data);
    } else if (typeof data === 'object') {
      // Object with key-value pairs
      if (this.query.columns.length === 0) {
        this.query.columns = Object.keys(data);
      }
      this.query.values.push(Object.values(data));
    }
    return this;
  }

  /**
   * Add multiple rows at once
   * @param {Array} dataArray - Array of objects or arrays
   * @returns {Insert} - Fluent interface
   */
  batchValues(dataArray) {
    if (!Array.isArray(dataArray)) {
      throw new Error('batchValues() requires an array');
    }

    dataArray.forEach(data => {
      this.values(data);
    });
    return this;
  }

  /**
   * Set data from object (convenience method)
   * @param {Object} data - Data object
   * @returns {Insert} - Fluent interface
   */
  set(data) {
    if (typeof data !== 'object') {
      throw new Error('set() requires an object');
    }

    this.query.columns = Object.keys(data);
    this.query.values = [Object.values(data)];
    return this;
  }

  /**
   * Add RETURNING clause (PostgreSQL/SQL Server)
   * @param {string|Array} columns - Columns to return
   * @returns {Insert} - Fluent interface
   */
  returning(columns) {
    if (typeof columns === 'string') {
      this.query.returning.push(columns);
    } else if (Array.isArray(columns)) {
      this.query.returning = this.query.returning.concat(columns);
    }
    return this;
  }

  /**
   * Handle conflicts (PostgreSQL: ON CONFLICT, MySQL: ON DUPLICATE KEY)
   * @param {string} action - Action to take ('IGNORE', 'UPDATE', or custom clause)
   * @param {Object} updateData - Data to update on conflict (optional)
   * @returns {Insert} - Fluent interface
   */
  onConflict(action, updateData = null) {
    this.query.onConflict = {
      action: action,
      updateData: updateData
    };
    return this;
  }

  /**
   * Add parameter and return placeholder
   * @param {*} value - Parameter value
   * @returns {string} - Parameter placeholder
   */
  _addParameter(value) {
    this.parameters.push(value);

    // Return appropriate placeholder based on adapter type
    if (this.adapter.constructor.name === 'PostgreSQLAdapter') {
      return `$${this.parameters.length}`;
    } else if (this.adapter.constructor.name === 'SqlServerAdapter') {
      return `@param${this.parameters.length - 1}`;
    } else {
      return '?';
    }
  }

  /**
   * Build the SQL INSERT query
   * @returns {string} - Complete SQL query
   */
  toString() {
    if (!this.query.table) {
      throw new Error('Table name is required for INSERT');
    }

    if (this.query.columns.length === 0 || this.query.values.length === 0) {
      throw new Error('Columns and values are required for INSERT');
    }

    let sql = 'INSERT INTO ';

    // Quote table name based on adapter
    if (this.adapter.constructor.name === 'MySQLAdapter') {
      sql += `\`${this.query.table}\``;
    } else if (this.adapter.constructor.name === 'SqlServerAdapter') {
      sql += `[${this.query.table}]`;
    } else {
      sql += `"${this.query.table}"`;
    }

    // Add columns
    const quotedColumns = this.query.columns.map(col => {
      if (this.adapter.constructor.name === 'MySQLAdapter') {
        return `\`${col}\``;
      } else if (this.adapter.constructor.name === 'SqlServerAdapter') {
        return `[${col}]`;
      } else {
        return `"${col}"`;
      }
    });

    sql += ` (${quotedColumns.join(', ')})`;

    // Add VALUES or OUTPUT (SQL Server)
    if (this.adapter.constructor.name === 'SqlServerAdapter' && this.query.returning.length > 0) {
      sql += ` OUTPUT ${this.query.returning.map(col => `INSERTED.${col}`).join(', ')}`;
    }

    sql += ' VALUES ';

    // Build values placeholders
    const valuePlaceholders = this.query.values.map(row => {
      const placeholders = row.map(value => this._addParameter(value));
      return `(${placeholders.join(', ')})`;
    });

    sql += valuePlaceholders.join(', ');

    // Add conflict handling
    if (this.query.onConflict) {
      if (this.adapter.constructor.name === 'PostgreSQLAdapter') {
        if (this.query.onConflict.action === 'IGNORE') {
          sql += ' ON CONFLICT DO NOTHING';
        } else if (this.query.onConflict.action === 'UPDATE' && this.query.onConflict.updateData) {
          const updatePairs = Object.keys(this.query.onConflict.updateData).map(key => {
            const value = this.query.onConflict.updateData[key];
            return `"${key}" = ${this._addParameter(value)}`;
          });
          sql += ` ON CONFLICT DO UPDATE SET ${updatePairs.join(', ')}`;
        }
      } else if (this.adapter.constructor.name === 'MySQLAdapter') {
        if (this.query.onConflict.action === 'IGNORE') {
          sql = sql.replace('INSERT INTO', 'INSERT IGNORE INTO');
        } else if (this.query.onConflict.action === 'UPDATE' && this.query.onConflict.updateData) {
          const updatePairs = Object.keys(this.query.onConflict.updateData).map(key => {
            const value = this.query.onConflict.updateData[key];
            return `\`${key}\` = ${this._addParameter(value)}`;
          });
          sql += ` ON DUPLICATE KEY UPDATE ${updatePairs.join(', ')}`;
        }
      }
    }

    // Add RETURNING clause (PostgreSQL)
    if (this.adapter.constructor.name === 'PostgreSQLAdapter' && this.query.returning.length > 0) {
      sql += ` RETURNING ${this.query.returning.join(', ')}`;
    }

    return sql;
  }

  /**
   * Execute the INSERT query
   * @returns {Promise<Object>} - Query result
   */
  async execute() {
    const sql = this.toString();
    const result = await this.adapter.query(sql, this.parameters);

    // Initial result normalization
    let insertedId = null;
    let insertedRow = null;
    let rowCount = 0;

    if (Array.isArray(result)) {
      // PostgreSQLAdapter returns array of rows directly
      insertedRow = result[0] || null;
      rowCount = result.length;

      // Try to guess insertedId from common ID columns if present
      if (insertedRow) {
        insertedId = insertedRow.id || insertedRow.folder_id || insertedRow.user_id || null;
      }
    } else {
      // Other adapters might return object
      insertedId = result.insertedId;
      insertedRow = result.rows?.[0] || null;
      rowCount = result.rowCount || result.affectedRows || 0;
    }

    return {
      insertedId: insertedId,
      insertedRecord: insertedRow,
      affectedRows: rowCount,
      success: rowCount > 0
    };
  }

  /**
   * Reset query state
   * @returns {Insert} - Fluent interface
   */
  reset() {
    this.query = {
      table: null,
      columns: [],
      values: [],
      onConflict: null,
      returning: []
    };
    this.parameters = [];
    return this;
  }

  /**
   * Clone this insert query
   * @returns {Insert} - New Insert instance
   */
  clone() {
    const cloned = new Insert(this.adapter);
    cloned.query = JSON.parse(JSON.stringify(this.query));
    cloned.parameters = [...this.parameters];
    return cloned;
  }
}

module.exports = Insert;