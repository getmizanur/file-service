/**
 * Database Statement Interface - Abstract base class for prepared statements
 * Provides consistent statement execution across different database backends
 */
class Statement {

  constructor(adapter, sql) {
    this.adapter = adapter;
    this.sql = sql;
    this.parameters = [];
    this.boundParams = new Map();
    this.fetchMode = 'object'; // 'object', 'array', 'column'
    this.prepared = false;
  }

  /**
   * Prepare the statement for execution
   * @returns {Promise<Statement>} - Returns this for method chaining
   */
  async prepare() {
    if(this.prepared) {
      return this;
    }

    await this._prepare();
    this.prepared = true;
    return this;
  }

  /**
   * Execute the prepared statement with optional parameters
   * @param {Array|Object} params - Parameters to bind and execute
   * @returns {Promise<*>} - Execution result
   */
  async execute(params = null) {
    if(!this.prepared) {
      await this.prepare();
    }

    // Bind parameters if provided
    if(params) {
      if(Array.isArray(params)) {
        this.parameters = params;
      } else if(typeof params === 'object') {
        this.bindParams(params);
      }
    }

    return await this._execute();
  }

  /**
   * Bind a parameter to the statement
   * @param {string|number} param - Parameter name or index
   * @param {*} value - Parameter value
   * @param {string} type - Parameter type (optional)
   * @returns {Statement} - Returns this for method chaining
   */
  bindParam(param, value, type = null) {
    if(typeof param === 'number') {
      this.parameters[param] = value;
    } else {
      this.boundParams.set(param, {
        value,
        type
      });
    }
    return this;
  }

  /**
   * Bind multiple parameters to the statement
   * @param {Object} params - Object with parameter names/values
   * @returns {Statement} - Returns this for method chaining
   */
  bindParams(params) {
    for(const [key, value] of Object.entries(params)) {
      this.bindParam(key, value);
    }
    return this;
  }

  /**
   * Bind a value to the statement (same as bindParam but different signature)
   * @param {string|number} param - Parameter name or index
   * @param {*} value - Parameter value
   * @returns {Statement} - Returns this for method chaining
   */
  bindValue(param, value) {
    return this.bindParam(param, value);
  }

  /**
   * Set the fetch mode for results
   * @param {string} mode - Fetch mode: 'object', 'array', 'column'
   * @returns {Statement} - Returns this for method chaining
   */
  setFetchMode(mode) {
    this.fetchMode = mode;
    return this;
  }

  /**
   * Fetch the next row from the result set
   * @returns {Promise<*>} - Next row or null if no more rows
   */
  async fetch() {
    throw new Error('fetch() must be implemented by concrete statement class');
  }

  /**
   * Fetch all remaining rows from the result set
   * @returns {Promise<Array>} - Array of all rows
   */
  async fetchAll() {
    throw new Error('fetchAll() must be implemented by concrete statement class');
  }

  /**
   * Fetch a single column from the next row
   * @param {number} columnIndex - Column index (0-based)
   * @returns {Promise<*>} - Column value or null
   */
  async fetchColumn(columnIndex = 0) {
    throw new Error('fetchColumn() must be implemented by concrete statement class');
  }

  /**
   * Fetch the first row from the result set
   * @returns {Promise<*>} - First row or null if no rows
   */
  async fetchRow() {
    const result = await this.fetchAll();
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Get the number of rows affected by the last statement
   * @returns {Promise<number>} - Number of affected rows
   */
  async rowCount() {
    throw new Error('rowCount() must be implemented by concrete statement class');
  }

  /**
   * Get the ID of the last inserted row
   * @returns {Promise<*>} - Last insert ID
   */
  async lastInsertId() {
    throw new Error('lastInsertId() must be implemented by concrete statement class');
  }

  /**
   * Close the statement and free resources
   * @returns {Promise<void>}
   */
  async close() {
    await this._close();
    this.prepared = false;
  }

  /**
   * Get the SQL query string
   * @returns {string} - SQL query
   */
  getSQL() {
    return this.sql;
  }

  /**
   * Get the bound parameters
   * @returns {Array|Map} - Parameters array or Map
   */
  getParameters() {
    return this.boundParams.size > 0 ? this.boundParams : this.parameters;
  }

  /**
   * Database-specific preparation logic (implemented by concrete classes)
   * @protected
   */
  async _prepare() {
    // Default implementation - override in concrete classes
  }

  /**
   * Database-specific execution logic (implemented by concrete classes)
   * @protected
   */
  async _execute() {
    throw new Error('_execute() must be implemented by concrete statement class');
  }

  /**
   * Database-specific cleanup logic (implemented by concrete classes)
   * @protected
   */
  async _close() {
    // Default implementation - override in concrete classes
  }

  /**
   * Convert bound parameters to array format for execution
   * @protected
   */
  _prepareParameters() {
    if(this.boundParams.size === 0) {
      return this.parameters;
    }

    const params = [];
    let sql = this.sql;

    // Replace named parameters with positional ones
    for(const [name, param] of this.boundParams) {
      const placeholder = `:${name}`;
      const index = params.length;
      params.push(param.value);

      // Replace named parameter with database-specific placeholder
      sql = sql.replace(new RegExp(placeholder, 'g'), this.adapter.getParameterPlaceholder(index));
    }

    this.sql = sql;
    this.parameters = params;
    return params;
  }

  /**
   * Format result based on fetch mode
   * @param {Array} rows - Raw database rows
   * @returns {Array} - Formatted rows
   * @protected
   */
  _formatResult(rows) {
    if(!Array.isArray(rows)) {
      return rows;
    }

    switch(this.fetchMode) {
      case 'array':
        return rows.map(row => {
          if(typeof row === 'object' && row !== null) {
            return Object.values(row);
          }
          return row;
        });

      case 'column':
        return rows.map(row => {
          if(typeof row === 'object' && row !== null) {
            return Object.values(row)[0];
          }
          return row;
        });

      case 'object':
      default:
        return rows;
    }
  }
}

module.exports = Statement;