/**
 * Delete Query Builder
 * 
 * Provides a fluent interface for constructing DELETE queries safely and efficiently.
 * Supports conditional deletes, joins, subqueries, and database-specific features
 * like OUTPUT/RETURNING clauses.
 * 
 * @author Database Query Builder Framework
 */

class Delete {
  /**
   * Initialize Delete query builder
   * @param {DatabaseAdapter} adapter - Database adapter instance
   */
  constructor(adapter) {
    this.adapter = adapter;
    this.query = {
      table: null,
      tableAlias: null,
      joins: [],
      conditions: [],
      returning: [],
      limit: null,
      orderBy: []
    };
    this.parameters = [];
  }

  /**
   * Set target table for delete
   * @param {string|Object} table - Table name or {alias: tableName}
   * @returns {Delete} - Fluent interface
   */
  from(table) {
    if(typeof table === 'string') {
      this.query.table = table;
    } else if(typeof table === 'object') {
      const alias = Object.keys(table)[0];
      this.query.table = table[alias];
      this.query.tableAlias = alias;
    }
    return this;
  }

  /**
   * Add WHERE condition
   * @param {string} condition - WHERE condition with ? placeholders
   * @param {...*} values - Values to bind
   * @returns {Delete} - Fluent interface
   */
  where(condition, ...values) {
    this.query.conditions.push({
      type: 'AND',
      condition: condition,
      values: values
    });
    return this;
  }

  /**
   * Add WHERE condition with OR
   * @param {string} condition - WHERE condition with ? placeholders
   * @param {...*} values - Values to bind
   * @returns {Delete} - Fluent interface
   */
  whereOr(condition, ...values) {
    this.query.conditions.push({
      type: 'OR',
      condition: condition,
      values: values
    });
    return this;
  }

  /**
   * Add WHERE IN condition
   * @param {string} column - Column name
   * @param {Array} values - Array of values
   * @returns {Delete} - Fluent interface
   */
  whereIn(column, values) {
    if(!Array.isArray(values) || values.length === 0) {
      throw new Error('whereIn() requires non-empty array');
    }

    const placeholders = values.map(() => '?').join(', ');
    return this.where(`${this._quoteIdentifier(column)} IN (${placeholders})`, ...values);
  }

  /**
   * Add WHERE NOT IN condition
   * @param {string} column - Column name
   * @param {Array} values - Array of values
   * @returns {Delete} - Fluent interface
   */
  whereNotIn(column, values) {
    if(!Array.isArray(values) || values.length === 0) {
      throw new Error('whereNotIn() requires non-empty array');
    }

    const placeholders = values.map(() => '?').join(', ');
    return this.where(`${this._quoteIdentifier(column)} NOT IN (${placeholders})`, ...values);
  }

  /**
   * Add WHERE BETWEEN condition
   * @param {string} column - Column name
   * @param {*} start - Start value
   * @param {*} end - End value
   * @returns {Delete} - Fluent interface
   */
  whereBetween(column, start, end) {
    return this.where(`${this._quoteIdentifier(column)} BETWEEN ? AND ?`, start, end);
  }

  /**
   * Add WHERE NOT BETWEEN condition
   * @param {string} column - Column name
   * @param {*} start - Start value
   * @param {*} end - End value
   * @returns {Delete} - Fluent interface
   */
  whereNotBetween(column, start, end) {
    return this.where(`${this._quoteIdentifier(column)} NOT BETWEEN ? AND ?`, start, end);
  }

  /**
   * Add WHERE NULL condition
   * @param {string} column - Column name
   * @returns {Delete} - Fluent interface
   */
  whereNull(column) {
    return this.where(`${this._quoteIdentifier(column)} IS NULL`);
  }

  /**
   * Add WHERE NOT NULL condition
   * @param {string} column - Column name
   * @returns {Delete} - Fluent interface
   */
  whereNotNull(column) {
    return this.where(`${this._quoteIdentifier(column)} IS NOT NULL`);
  }

  /**
   * Add WHERE EXISTS condition
   * @param {string} subquery - Subquery
   * @param {...*} values - Values to bind
   * @returns {Delete} - Fluent interface
   */
  whereExists(subquery, ...values) {
    return this.where(`EXISTS (${subquery})`, ...values);
  }

  /**
   * Add WHERE NOT EXISTS condition
   * @param {string} subquery - Subquery
   * @param {...*} values - Values to bind
   * @returns {Delete} - Fluent interface
   */
  whereNotExists(subquery, ...values) {
    return this.where(`NOT EXISTS (${subquery})`, ...values);
  }

  /**
   * Add JOIN clause
   * @param {string|Object} table - Table name or {alias: tableName}
   * @param {string} condition - JOIN condition
   * @param {string} type - JOIN type (INNER, LEFT, RIGHT)
   * @returns {Delete} - Fluent interface
   */
  join(table, condition, type = 'INNER') {
    let tableName, alias;

    if(typeof table === 'string') {
      tableName = table;
      alias = null;
    } else {
      alias = Object.keys(table)[0];
      tableName = table[alias];
    }

    this.query.joins.push({
      type: type,
      table: tableName,
      alias: alias,
      condition: condition
    });
    return this;
  }

  /**
   * Add LEFT JOIN
   * @param {string|Object} table - Table name or {alias: tableName}
   * @param {string} condition - JOIN condition
   * @returns {Delete} - Fluent interface
   */
  joinLeft(table, condition) {
    return this.join(table, condition, 'LEFT');
  }

  /**
   * Add RIGHT JOIN
   * @param {string|Object} table - Table name or {alias: tableName}
   * @param {string} condition - JOIN condition
   * @returns {Delete} - Fluent interface
   */
  joinRight(table, condition) {
    return this.join(table, condition, 'RIGHT');
  }

  /**
   * Add ORDER BY clause (for LIMIT with ORDER)
   * @param {string} column - Column to sort by
   * @param {string} direction - Sort direction (ASC/DESC)
   * @returns {Delete} - Fluent interface
   */
  orderBy(column, direction = 'ASC') {
    this.query.orderBy.push({
      column: column,
      direction: direction.toUpperCase()
    });
    return this;
  }

  /**
   * Set LIMIT (MySQL/SQLite)
   * @param {number} count - Maximum number of rows to delete
   * @returns {Delete} - Fluent interface
   */
  limit(count) {
    this.query.limit = count;
    return this;
  }

  /**
   * Add RETURNING clause (PostgreSQL/SQL Server)
   * @param {string|Array} columns - Columns to return
   * @returns {Delete} - Fluent interface
   */
  returning(columns) {
    if(typeof columns === 'string') {
      this.query.returning.push(columns);
    } else if(Array.isArray(columns)) {
      this.query.returning = this.query.returning.concat(columns);
    }
    return this;
  }

  /**
   * Quote identifier based on database type
   * @param {string} identifier - Identifier to quote
   * @returns {string} - Quoted identifier
   */
  _quoteIdentifier(identifier) {
    if(this.adapter.constructor.name === 'MySQLAdapter') {
      return `\`${identifier}\``;
    } else if(this.adapter.constructor.name === 'SqlServerAdapter') {
      return `[${identifier}]`;
    } else {
      return `"${identifier}"`;
    }
  }

  /**
   * Add parameter and return placeholder
   * @param {*} value - Parameter value
   * @returns {string} - Parameter placeholder
   */
  _addParameter(value) {
    this.parameters.push(value);

    // Return appropriate placeholder based on adapter type
    if(this.adapter.constructor.name === 'PostgreSQLAdapter') {
      return `$${this.parameters.length}`;
    } else if(this.adapter.constructor.name === 'SqlServerAdapter') {
      return `@param${this.parameters.length - 1}`;
    } else {
      return '?';
    }
  }

  /**
   * Build the SQL DELETE query
   * @returns {string} - Complete SQL query
   */
  toString() {
    if(!this.query.table) {
      throw new Error('Table name is required for DELETE');
    }

    let sql = 'DELETE ';

    // Add table alias for multi-table deletes
    if(this.query.tableAlias) {
      sql += this._quoteIdentifier(this.query.tableAlias);
    }

    sql += ' FROM ';

    // Add table with alias
    sql += this._quoteIdentifier(this.query.table);
    if(this.query.tableAlias) {
      sql += ` AS ${this._quoteIdentifier(this.query.tableAlias)}`;
    }

    // Add JOINs
    this.query.joins.forEach(join => {
      sql += ` ${join.type} JOIN ${this._quoteIdentifier(join.table)}`;
      if(join.alias) {
        sql += ` AS ${this._quoteIdentifier(join.alias)}`;
      }
      sql += ` ON ${join.condition}`;
    });

    // Add OUTPUT clause for SQL Server (before WHERE)
    if(this.adapter.constructor.name === 'SqlServerAdapter' && this.query.returning.length > 0) {
      sql += ` OUTPUT ${this.query.returning.map(col => `DELETED.${col}`).join(', ')}`;
    }

    // Add WHERE conditions
    if(this.query.conditions.length > 0) {
      sql += ' WHERE ';
      const conditionParts = this.query.conditions.map((cond, index) => {
        // Process placeholders in condition
        let processedCondition = cond.condition;
        cond.values.forEach(value => {
          processedCondition = processedCondition.replace('?', this._addParameter(value));
        });

        if(index === 0) {
          return processedCondition;
        } else {
          return `${cond.type} ${processedCondition}`;
        }
      });
      sql += conditionParts.join(' ');
    }

    // Add ORDER BY (for limited deletes)
    if(this.query.orderBy.length > 0 && this.query.limit) {
      sql += ' ORDER BY ';
      const orderParts = this.query.orderBy.map(order =>
        `${this._quoteIdentifier(order.column)} ${order.direction}`
      );
      sql += orderParts.join(', ');
    }

    // Add LIMIT (MySQL/SQLite)
    if(this.query.limit && ['MySQLAdapter', 'SQLiteAdapter'].includes(this.adapter.constructor.name)) {
      sql += ` LIMIT ${this.query.limit}`;
    }

    // Add RETURNING clause (PostgreSQL)
    if(this.adapter.constructor.name === 'PostgreSQLAdapter' && this.query.returning.length > 0) {
      sql += ` RETURNING ${this.query.returning.join(', ')}`;
    }

    return sql;
  }

  /**
   * Execute the DELETE query
   * @returns {Promise<Object>} - Query result
   */
  async execute() {
    const sql = this.toString();
    const result = await this.adapter.query(sql, this.parameters);

    return {
      affectedRows: result.rowCount,
      deletedRecords: result.rows || null,
      success: result.rowCount > 0
    };
  }

  /**
   * Execute truncate (delete all rows)
   * @returns {Promise<Object>} - Query result
   */
  async truncate() {
    if(!this.query.table) {
      throw new Error('Table name is required for TRUNCATE');
    }

    let sql;
    if(this.adapter.constructor.name === 'SQLiteAdapter') {
      // SQLite doesn't have TRUNCATE, use DELETE
      sql = `DELETE FROM ${this._quoteIdentifier(this.query.table)}`;
    } else {
      sql = `TRUNCATE TABLE ${this._quoteIdentifier(this.query.table)}`;
    }

    const result = await this.adapter.query(sql);

    return {
      affectedRows: result.rowCount || 0,
      success: true
    };
  }

  /**
   * Reset query state
   * @returns {Delete} - Fluent interface
   */
  reset() {
    this.query = {
      table: null,
      tableAlias: null,
      joins: [],
      conditions: [],
      returning: [],
      limit: null,
      orderBy: []
    };
    this.parameters = [];
    return this;
  }

  /**
   * Clone this delete query
   * @returns {Delete} - New Delete instance
   */
  clone() {
    const cloned = new Delete(this.adapter);
    cloned.query = JSON.parse(JSON.stringify(this.query));
    cloned.parameters = [...this.parameters];
    return cloned;
  }
}

module.exports = Delete;