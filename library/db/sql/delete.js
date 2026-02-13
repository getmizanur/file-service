/**
 * Delete Query Builder
 *
 * Provides a fluent interface for constructing DELETE queries safely and efficiently.
 * Supports conditional deletes, joins, subqueries, and database-specific features
 * like OUTPUT/RETURNING clauses.
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
      joins: [],        // used for non-Postgres JOIN deletes; for Postgres translated to USING
      using: [],        // explicit Postgres USING
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
   * @returns {Delete}
   */
  from(table) {
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
   * Add WHERE condition
   * @param {string} condition - WHERE condition with ? placeholders
   * @param {...*} values - Values to bind
   * @returns {Delete}
   */
  where(condition, ...values) {
    this.query.conditions.push({
      type: 'AND',
      condition,
      values
    });
    return this;
  }

  /**
   * Add WHERE condition with OR
   * @param {string} condition - WHERE condition with ? placeholders
   * @param {...*} values - Values to bind
   * @returns {Delete}
   */
  whereOr(condition, ...values) {
    this.query.conditions.push({
      type: 'OR',
      condition,
      values
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

  whereBetween(column, start, end) {
    return this.where(`${this._quoteIdentifier(column)} BETWEEN ? AND ?`, start, end);
  }

  whereNotBetween(column, start, end) {
    return this.where(`${this._quoteIdentifier(column)} NOT BETWEEN ? AND ?`, start, end);
  }

  whereNull(column) {
    return this.where(`${this._quoteIdentifier(column)} IS NULL`);
  }

  whereNotNull(column) {
    return this.where(`${this._quoteIdentifier(column)} IS NOT NULL`);
  }

  whereExists(subquery, ...values) {
    return this.where(`EXISTS (${subquery})`, ...values);
  }

  whereNotExists(subquery, ...values) {
    return this.where(`NOT EXISTS (${subquery})`, ...values);
  }

  /**
   * Add JOIN clause
   * - Non-Postgres: emitted as JOIN
   * - Postgres: translated to USING + WHERE (join predicate moved into WHERE)
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
      type,
      table: tableName,
      alias,
      condition
    });
    return this;
  }

  joinLeft(table, condition) {
    return this.join(table, condition, 'LEFT');
  }

  joinRight(table, condition) {
    return this.join(table, condition, 'RIGHT');
  }

  /**
   * Explicit Postgres USING clause (optional)
   * @param {string|Object} table - Table name or {alias: tableName}
   * @param {string|null} condition - Join predicate added into WHERE (e.g. "tm.tenant_id = fs.tenant_id")
   */
  using(table, condition = null) {
    let tableName, alias;

    if (typeof table === 'string') {
      tableName = table;
      alias = null;
    } else if (typeof table === 'object') {
      alias = Object.keys(table)[0];
      tableName = table[alias];
    } else {
      throw new Error('using() expects table name string or {alias: tableName}');
    }

    this.query.using.push({
      table: tableName,
      alias,
      condition
    });
    return this;
  }

  orderBy(column, direction = 'ASC') {
    this.query.orderBy.push({
      column,
      direction: direction.toUpperCase()
    });
    return this;
  }

  limit(count) {
    this.query.limit = count;
    return this;
  }

  returning(columns) {
    if (typeof columns === 'string') {
      this.query.returning.push(columns);
    } else if (Array.isArray(columns)) {
      this.query.returning = this.query.returning.concat(columns);
    }
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

  _formatTableWithAlias(tableName, alias) {
    let out = this._quoteIdentifier(tableName);
    if (alias) out += ` AS ${this._quoteIdentifier(alias)}`;
    return out;
  }

  /**
   * Build the SQL DELETE query
   * @returns {string}
   */
  toString() {
    if (!this.query.table) {
      throw new Error('Table name is required for DELETE');
    }

    const adapterName = this.adapter.constructor.name;

    // ============================================================
    // PostgreSQL (DELETE FROM ... USING ... WHERE ... RETURNING ...)
    // ============================================================
    if (adapterName === 'PostgreSQLAdapter') {
      let sql = 'DELETE FROM ';

      // target table
      sql += this._formatTableWithAlias(this.query.table, this.query.tableAlias);

      // USING tables: explicit using() + joins translated to USING tables
      const usingTables = [];

      for (const u of this.query.using) {
        usingTables.push(this._formatTableWithAlias(u.table, u.alias));
      }
      for (const j of this.query.joins) {
        usingTables.push(this._formatTableWithAlias(j.table, j.alias));
      }

      if (usingTables.length > 0) {
        sql += ` USING ${usingTables.join(', ')}`;
      }

      // WHERE parts (operator-aware, avoids AND AND)
      const whereParts = [];
      const addWhere = (expr, op = 'AND') => {
        if (!expr) return;
        if (whereParts.length === 0) whereParts.push(expr);
        else whereParts.push(`${op} ${expr}`);
      };

      // join predicates -> WHERE (always AND)
      for (const u of this.query.using) {
        if (u.condition) addWhere(u.condition, 'AND');
      }
      for (const j of this.query.joins) {
        if (j.condition) addWhere(j.condition, 'AND');
      }

      // user conditions (respect AND/OR)
      for (const cond of this.query.conditions) {
        let processed = cond.condition;
        cond.values.forEach(value => {
          processed = processed.replace('?', this._addParameter(value));
        });

        // first clause will have no prefix; subsequent will use cond.type
        addWhere(processed, cond.type);
      }

      if (whereParts.length > 0) {
        sql += ' WHERE ' + whereParts.join(' ');
      }

      if (this.query.returning.length > 0) {
        sql += ` RETURNING ${this.query.returning.join(', ')}`;
      }

      return sql;
    }

    // ============================================================
    // Other DBs (existing behavior)
    // ============================================================
    let sql = 'DELETE ';

    // Add table alias for multi-table deletes (MySQL-style)
    if (this.query.tableAlias) {
      sql += this._quoteIdentifier(this.query.tableAlias);
    }

    sql += ' FROM ';

    sql += this._quoteIdentifier(this.query.table);
    if (this.query.tableAlias) {
      sql += ` AS ${this._quoteIdentifier(this.query.tableAlias)}`;
    }

    // JOINs (non-Postgres)
    this.query.joins.forEach(join => {
      sql += ` ${join.type} JOIN ${this._quoteIdentifier(join.table)}`;
      if (join.alias) {
        sql += ` AS ${this._quoteIdentifier(join.alias)}`;
      }
      sql += ` ON ${join.condition}`;
    });

    // OUTPUT for SQL Server
    if (adapterName === 'SqlServerAdapter' && this.query.returning.length > 0) {
      sql += ` OUTPUT ${this.query.returning.map(col => `DELETED.${col}`).join(', ')}`;
    }

    // WHERE
    if (this.query.conditions.length > 0) {
      sql += ' WHERE ';
      const parts = this.query.conditions.map((cond, index) => {
        let processed = cond.condition;
        cond.values.forEach(value => {
          processed = processed.replace('?', this._addParameter(value));
        });

        if (index === 0) return processed;
        return `${cond.type} ${processed}`;
      });
      sql += parts.join(' ');
    }

    // ORDER BY (for limited deletes)
    if (this.query.orderBy.length > 0 && this.query.limit) {
      sql += ' ORDER BY ';
      const orderParts = this.query.orderBy.map(order =>
        `${this._quoteIdentifier(order.column)} ${order.direction}`
      );
      sql += orderParts.join(', ');
    }

    // LIMIT (MySQL/SQLite)
    if (this.query.limit && ['MySQLAdapter', 'SQLiteAdapter'].includes(adapterName)) {
      sql += ` LIMIT ${this.query.limit}`;
    }

    // RETURNING for Postgres handled above; leave as-is here
    return sql;
  }

  /**
   * Execute the DELETE query
   * @returns {Promise<Object>}
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
   * @returns {Promise<Object>}
   */
  async truncate() {
    if (!this.query.table) {
      throw new Error('Table name is required for TRUNCATE');
    }

    let sql;
    if (this.adapter.constructor.name === 'SQLiteAdapter') {
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

  reset() {
    this.query = {
      table: null,
      tableAlias: null,
      joins: [],
      using: [],
      conditions: [],
      returning: [],
      limit: null,
      orderBy: []
    };
    this.parameters = [];
    return this;
  }

  clone() {
    const cloned = new Delete(this.adapter);
    cloned.query = JSON.parse(JSON.stringify(this.query));
    cloned.parameters = [...this.parameters];
    return cloned;
  }
}

module.exports = Delete;