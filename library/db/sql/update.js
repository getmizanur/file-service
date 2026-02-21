/**
 * Update Query Builder
 *
 * Provides a fluent interface for constructing UPDATE queries safely and efficiently.
 * Supports conditional updates, joins, subqueries, and database-specific features
 * like OUTPUT/RETURNING clauses.
 *
 * @author Database Query Builder Framework
 */

class Update {
  /**
   * Initialize Update query builder
   * @param {DatabaseAdapter} adapter - Database adapter instance
   */
  constructor(adapter) {
    this.adapter = adapter;
    this.query = {
      table: null,
      tableAlias: null,
      sets: [],
      joins: [],
      conditions: [],
      returning: [],
      limit: null
    };
    this.parameters = [];
  }

  /**
   * Set target table for update
   * @param {string|Object} table - Table name or {alias: tableName}
   * @returns {Update} - Fluent interface
   */
  table(table) {
    if (typeof table === 'string') {
      this.query.table = table;
    } else if (typeof table === 'object') {
      const alias = Object.keys(table)[0];
      this.query.table = table[alias];
      this.query.tableAlias = alias;
    }
    return this;
  }

  /**
   * Set single column value OR multiple via object
   * @param {string|Object} column - Column name OR object of {col: value}
   * @param {*} value - Value to set (if column is string)
   * @returns {Update} - Fluent interface
   */
  set(column, value) {
    if (typeof column === 'object') {
      Object.keys(column).forEach(key => {
        this.query.sets.push({
          column: key,
          value: column[key]
        });
      });
    } else {
      this.query.sets.push({
        column: column,
        value: value
      });
    }
    return this;
  }

  /**
   * Set column to raw SQL expression
   * @param {string} column - Column name
   * @param {string} expression - Raw SQL expression
   * @returns {Update} - Fluent interface
   */
  setRaw(column, expression) {
    this.query.sets.push({
      column: column,
      value: expression,
      isRaw: true
    });
    return this;
  }

  increment(column, amount = 1) {
    const quotedColumn = this._quoteIdentifier(column);
    return this.setRaw(column, `${quotedColumn} + ${amount}`);
  }

  decrement(column, amount = 1) {
    const quotedColumn = this._quoteIdentifier(column);
    return this.setRaw(column, `${quotedColumn} - ${amount}`);
  }

  /**
   * Add WHERE condition
   * @param {string} condition - WHERE condition with ? placeholders
   * @param {...*} values - Values to bind
   * @returns {Update} - Fluent interface
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
   * @returns {Update} - Fluent interface
   */
  whereOr(condition, ...values) {
    this.query.conditions.push({
      type: 'OR',
      condition: condition,
      values: values
    });
    return this;
  }

  whereIn(column, values) {
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error('whereIn() requires non-empty array');
    }

    const placeholders = values.map(() => '?').join(', ');
    return this.where(`${this._quoteIdentifier(column)} IN (${placeholders})`, ...values);
  }

  whereNotIn(column, values) {
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error('whereNotIn() requires non-empty array');
    }

    const placeholders = values.map(() => '?').join(', ');
    return this.where(`${this._quoteIdentifier(column)} NOT IN (${placeholders})`, ...values);
  }

  /**
   * Add JOIN clause
   */
  join(table, condition, type = 'INNER') {
    let tableName, alias;

    if (typeof table === 'string') {
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

  joinLeft(table, condition) {
    return this.join(table, condition, 'LEFT');
  }

  /**
   * Add RETURNING clause (PostgreSQL/SQL Server)
   * @param {string|Array} columns - Columns to return
   * @returns {Update} - Fluent interface
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
   * Set LIMIT (MySQL/SQLite)
   * @param {number} count - Maximum number of rows to update
   * @returns {Update} - Fluent interface
   */
  limit(count) {
    this.query.limit = count;
    return this;
  }

  _quoteIdentifier(identifier) {
    if (this.adapter.constructor.name === 'MySQLAdapter') {
      return `\`${identifier}\``;
    } else if (this.adapter.constructor.name === 'SqlServerAdapter') {
      return `[${identifier}]`;
    } else {
      return `"${identifier}"`;
    }
  }

  _addParameter(value) {
    this.parameters.push(value);

    if (this.adapter.constructor.name === 'PostgreSQLAdapter') {
      return `$${this.parameters.length}`;
    } else if (this.adapter.constructor.name === 'SqlServerAdapter') {
      return `@param${this.parameters.length - 1}`;
    } else {
      return '?';
    }
  }

  /**
   * Normalize adapter results:
   * - legacy adapters may return rows[]
   * - new adapters return { rows, rowCount, insertedId }
   * @private
   */
  _normalizeResult(result) {
    if (!result) return { rows: [], rowCount: 0, insertedId: null };

    if (Array.isArray(result)) {
      return { rows: result, rowCount: result.length, insertedId: null };
    }

    if (typeof result === 'object') {
      const rows = Array.isArray(result.rows) ? result.rows : [];
      const rowCount =
        typeof result.rowCount === 'number'
          ? result.rowCount
          : (typeof result.affectedRows === 'number' ? result.affectedRows : rows.length);

      return {
        rows,
        rowCount,
        insertedId: result.insertedId ?? null
      };
    }

    return { rows: [], rowCount: 0, insertedId: null };
  }

  /**
   * Build the SQL UPDATE query
   * @returns {string} - Complete SQL query
   */
  toString() {
    if (!this.query.table) {
      throw new Error('Table name is required for UPDATE');
    }

    if (this.query.sets.length === 0) {
      throw new Error('At least one SET clause is required for UPDATE');
    }

    let sql = 'UPDATE ';

    // Add table with alias
    sql += this._quoteIdentifier(this.query.table);
    if (this.query.tableAlias) {
      sql += ` AS ${this._quoteIdentifier(this.query.tableAlias)}`;
    }

    // Add JOINs
    this.query.joins.forEach(join => {
      sql += ` ${join.type} JOIN ${this._quoteIdentifier(join.table)}`;
      if (join.alias) {
        sql += ` AS ${this._quoteIdentifier(join.alias)}`;
      }
      sql += ` ON ${join.condition}`;
    });

    // Add OUTPUT clause for SQL Server (before SET)
    if (this.adapter.constructor.name === 'SqlServerAdapter' && this.query.returning.length > 0) {
      sql += ` OUTPUT ${this.query.returning.map(col => `INSERTED.${col}`).join(', ')}`;
    }

    // Add SET clauses
    sql += ' SET ';
    const setPairs = this.query.sets.map(set => {
      const column = this._quoteIdentifier(set.column);
      if (set.isRaw) {
        return `${column} = ${set.value}`;
      } else {
        const placeholder = this._addParameter(set.value);
        return `${column} = ${placeholder}`;
      }
    });
    sql += setPairs.join(', ');

    // Add WHERE conditions
    if (this.query.conditions.length > 0) {
      sql += ' WHERE ';
      const conditionParts = this.query.conditions.map((cond, index) => {
        let processedCondition = cond.condition;
        cond.values.forEach(value => {
          processedCondition = processedCondition.replace('?', this._addParameter(value));
        });

        if (index === 0) return processedCondition;
        return `${cond.type} ${processedCondition}`;
      });
      sql += conditionParts.join(' ');
    }

    // Add RETURNING clause (PostgreSQL)
    if (this.adapter.constructor.name === 'PostgreSQLAdapter' && this.query.returning.length > 0) {
      sql += ` RETURNING ${this.query.returning.join(', ')}`;
    }

    // Add LIMIT (MySQL/SQLite)
    if (this.query.limit && ['MySQLAdapter', 'SQLiteAdapter'].includes(this.adapter.constructor.name)) {
      sql += ` LIMIT ${this.query.limit}`;
    }

    return sql;
  }

  /**
   * Execute the UPDATE query
   * @returns {Promise<{affectedRows:number, updatedRecords:any[]|null, success:boolean}>}
   */
  async execute() {
    const sql = this.toString();
    const raw = await this.adapter.query(sql, this.parameters);
    const result = this._normalizeResult(raw);

    return {
      affectedRows: result.rowCount,
      updatedRecords: result.rows.length > 0 ? result.rows : null,
      success: result.rowCount > 0
    };
  }

  reset() {
    this.query = {
      table: null,
      tableAlias: null,
      sets: [],
      joins: [],
      conditions: [],
      returning: [],
      limit: null
    };
    this.parameters = [];
    return this;
  }

  clone() {
    const cloned = new Update(this.adapter);
    cloned.query = JSON.parse(JSON.stringify(this.query));
    cloned.parameters = [...this.parameters];
    return cloned;
  }
}

module.exports = Update;