// library/db/sql/select.js
/**
 * Database Query Builder - Fluent interface for building SQL SELECT queries
 * Provides object-oriented approach to constructing SQL queries safely
 */
class Select {

  constructor(dbAdapter = null) {
    this.db = dbAdapter;
    this.query = {
      select: [],
      from: null,
      joins: [],
      where: [],
      groupBy: [],
      having: [],
      orderBy: [],
      limit: null,
      offset: null
    };
    this.parameters = [];
    this.parameterIndex = 0;
  }

  /**
   * Set the table to select from
   * @param {string|object} table - Table name or object with alias {alias: 'tableName'}
   * @param {string|array|object|null} columns - Columns to select (optional)
   * @returns {Select} - Fluent interface
   */
  from(table, columns = ['*']) {
    if (typeof table === 'object') {
      // Handle aliased table: {u: 'users'}
      const alias = Object.keys(table)[0];
      const tableName = table[alias];
      this.query.from = `${tableName} AS ${alias}`;
    } else {
      this.query.from = table;
    }

    if (columns) {
      this.query.select = this._normalizeColumns(columns);
      this._dedupeSelectColumns();
    }

    return this;
  }

  /**
   * Add columns to SELECT clause
   * @param {string|array|object} columns - Columns to select
   * @returns {Select} - Fluent interface
   */
  columns(columns) {
    const normalizedColumns = this._normalizeColumns(columns);

    // If already selecting '*', don't add more columns (and don't add another '*')
    if (this.query.select.includes('*')) {
      const filtered = normalizedColumns.filter(c => c !== '*');
      if (filtered.length === 0) return this;
      // Keep '*' behavior: ignore additional columns unless caller used from(table, [])
      // If you prefer override behavior, call from(table, []) then columns([...])
      return this;
    }

    this.query.select = this.query.select.concat(normalizedColumns);
    this._dedupeSelectColumns();
    return this;
  }

  /**
   * Add WHERE condition
   * @param {string} condition - SQL condition with ? placeholders
   * @param {*} value - Value to bind (optional)
   * @returns {Select} - Fluent interface
   */
  where(condition, value) {
    // IMPORTANT: allow binding NULL by checking argument presence (not value !== null)
    if (arguments.length >= 2) {
      const placeholder = this._addParameter(value);
      condition = condition.replace('?', placeholder);
    }

    if (this.query.where.length > 0) {
      this.query.where.push(`AND ${condition}`);
    } else {
      this.query.where.push(condition);
    }

    return this;
  }

  /**
   * Add OR WHERE condition
   * @param {string} condition - SQL condition with ? placeholders
   * @param {*} value - Value to bind (optional)
   * @returns {Select} - Fluent interface
   */
  orWhere(condition, value) {
    // IMPORTANT: allow binding NULL by checking argument presence (not value !== null)
    if (arguments.length >= 2) {
      const placeholder = this._addParameter(value);
      condition = condition.replace('?', placeholder);
    }

    this.query.where.push(`OR ${condition}`);
    return this;
  }

  /**
   * WHERE IN (supports arrays)
   * @param {string} column - e.g. "file_id" or "fm.file_id"
   * @param {Array} values - list of values
   * @returns {Select}
   */
  whereIn(column, values) {
    if (!Array.isArray(values) || values.length === 0) {
      // IN () would be invalid; force no rows
      return this.where('1 = 0');
    }

    const placeholders = values.map(v => this._addParameter(v)).join(', ');
    return this.where(`${column} IN (${placeholders})`);
  }

  /**
   * WHERE NOT IN (supports arrays)
   * @param {string} column
   * @param {Array} values
   * @returns {Select}
   */
  whereNotIn(column, values) {
    if (!Array.isArray(values) || values.length === 0) {
      // NOT IN () with empty set is always true; do nothing
      return this;
    }

    const placeholders = values.map(v => this._addParameter(v)).join(', ');
    return this.where(`${column} NOT IN (${placeholders})`);
  }

  /**
   * Add INNER JOIN
   * @param {string|object} table - Table name or aliased object
   * @param {string} condition - Join condition
   * @param {string|array} columns - Columns to select from joined table
   * @returns {Select} - Fluent interface
   */
  join(table, condition, columns = []) {
    return this._join('INNER JOIN', table, condition, columns);
  }

  /**
   * Add LEFT JOIN
   * @param {string|object} table - Table name or aliased object
   * @param {string} condition - Join condition
   * @param {string|array} columns - Columns to select from joined table
   * @returns {Select} - Fluent interface
   */
  joinLeft(table, condition, columns = []) {
    return this._join('LEFT JOIN', table, condition, columns);
  }

  /**
   * Add RIGHT JOIN
   * @param {string|object} table - Table name or aliased object
   * @param {string} condition - Join condition
   * @param {string|array} columns - Columns to select from joined table
   * @returns {Select} - Fluent interface
   */
  joinRight(table, condition, columns = []) {
    return this._join('RIGHT JOIN', table, condition, columns);
  }

  /**
   * Add GROUP BY clause
   * @param {string|array} columns - Columns to group by
   * @returns {Select} - Fluent interface
   */
  group(columns) {
    if (Array.isArray(columns)) {
      this.query.groupBy = this.query.groupBy.concat(columns);
    } else {
      this.query.groupBy.push(columns);
    }
    return this;
  }

  /**
   * Add HAVING clause
   * @param {string} condition - HAVING condition with ? placeholders
   * @param {*} value - Value to bind (optional)
   * @returns {Select} - Fluent interface
   */
  having(condition, value) {
    // IMPORTANT: allow binding NULL by checking argument presence (not value !== null)
    if (arguments.length >= 2) {
      const placeholder = this._addParameter(value);
      condition = condition.replace('?', placeholder);
    }

    if (this.query.having.length > 0) {
      this.query.having.push(`AND ${condition}`);
    } else {
      this.query.having.push(condition);
    }

    return this;
  }

  /**
   * Add ORDER BY clause
   * @param {string} column - Column to order by
   * @param {string} direction - ASC or DESC (default: ASC)
   * @returns {Select} - Fluent interface
   */
  order(column, direction = 'ASC') {
    this.query.orderBy.push(`${column} ${direction.toUpperCase()}`);
    return this;
  }

  /**
   * Add LIMIT clause
   * @param {number} count - Number of rows to limit
   * @param {number} offset - Offset for pagination (optional)
   * @returns {Select} - Fluent interface
   */
  limit(count, offset = null) {
    this.query.limit = count;
    if (offset !== null) {
      this.query.offset = offset;
    }
    return this;
  }

  /**
   * Add OFFSET clause (alternative to limit with offset)
   * @param {number} offset - Number of rows to skip
   * @returns {Select} - Fluent interface
   */
  offset(offset) {
    this.query.offset = offset;
    return this;
  }

  /**
   * UNION with another Select (or raw SQL string)
   * NOTE: ORDER/LIMIT/OFFSET should be applied on the outer-most query only.
   */
  union(otherSelectOrSql) {
    return this._addUnion('UNION', otherSelectOrSql);
  }

  /**
   * UNION ALL with another Select (or raw SQL string)
   */
  unionAll(otherSelectOrSql) {
    return this._addUnion('UNION ALL', otherSelectOrSql);
  }

  _addUnion(type, otherSelectOrSql) {
    if (!this.query.unions) this.query.unions = [];

    if (otherSelectOrSql instanceof Select) {
      // Build other SQL without ORDER/LIMIT/OFFSET, and rebase placeholders
      const other = otherSelectOrSql.clone();
      other.query.orderBy = [];
      other.query.limit = null;
      other.query.offset = null;

      const otherSqlRaw = other._buildQuery({ suppressOrderLimitOffset: true });
      const otherParams = other.getParameters();

      const rebasedSql = this._rebasePlaceholders(otherSqlRaw, this.parameterIndex);

      // merge parameters + advance parameterIndex
      this.parameters = this.parameters.concat(otherParams);
      this.parameterIndex += otherParams.length;

      this.query.unions.push({ type, sql: rebasedSql });
      return this;
    }

    // Raw SQL string case (caller is responsible for placeholders/params)
    if (typeof otherSelectOrSql === 'string') {
      this.query.unions.push({ type, sql: otherSelectOrSql });
      return this;
    }

    throw new Error('union/unionAll expects a Select instance or SQL string');
  }

  _rebasePlaceholders(sql, offset) {
    // $1 -> $(1+offset), $2 -> $(2+offset), ...
    return sql.replace(/\$(\d+)/g, (_, n) => `$${Number(n) + offset}`);
  }

  /**
   * Build and return the SQL query string
   * @returns {string} - Complete SQL SELECT statement
   */
  toString() {
    return this._buildQuery();
  }

  /**
   * Magic method to convert object to string
   * @returns {string} - Complete SQL SELECT statement
   */
  __toString() {
    return this.toString();
  }

  /**
   * Get the bound parameters array
   * @returns {array} - Array of parameter values
   */
  getParameters() {
    return this.parameters;
  }

  /**
   * Normalize adapter results:
   * - legacy adapters might return rows[]
   * - new adapters return { rows, rowCount, insertedId }
   * @private
   */
  _normalizeResult(result) {
    if (!result) return { rows: [], rowCount: 0, insertedId: null };

    // legacy: adapter returns array of rows
    if (Array.isArray(result)) {
      return { rows: result, rowCount: result.length, insertedId: null };
    }

    // structured: adapter returns object with rows
    if (typeof result === 'object' && Array.isArray(result.rows)) {
      return {
        rows: result.rows,
        rowCount: typeof result.rowCount === 'number' ? result.rowCount : result.rows.length,
        insertedId: result.insertedId ?? null
      };
    }

    // fallback: unknown shape
    return { rows: [], rowCount: 0, insertedId: null };
  }

  /**
   * Execute the query if database adapter is available
   * @returns {Promise<Array>} - Always returns rows array
   */
  async execute() {
    if (!this.db) {
      throw new Error('Database adapter not set. Cannot execute query.');
    }

    const sql = this.toString();
    const params = this.getParameters();

    const result = await this.db.query(sql, params);
    return this._normalizeResult(result).rows;
  }

  /**
   * Execute and return normalized raw result ({ rows, rowCount, insertedId })
   * Useful for pagination metadata, etc.
   * @returns {Promise<{rows:Array,rowCount:number,insertedId:any}>}
   */
  async executeRaw() {
    if (!this.db) {
      throw new Error('Database adapter not set. Cannot execute query.');
    }

    const sql = this.toString();
    const params = this.getParameters();

    const result = await this.db.query(sql, params);
    return this._normalizeResult(result);
  }

  /**
   * Internal method to handle different types of JOINs
   * @private
   */
  _join(type, table, condition, columns) {
    let tableClause;

    if (typeof table === 'object') {
      // Handle aliased table: {p: 'profiles'}
      const alias = Object.keys(table)[0];
      const tableName = table[alias];
      tableClause = `${tableName} AS ${alias}`;
    } else {
      tableClause = table;
    }

    this.query.joins.push(`${type} ${tableClause} ON ${condition}`);

    if (columns && columns.length > 0) {
      const normalizedColumns = this._normalizeColumns(columns);

      // If already selecting '*', ignore extra columns to avoid "*, col"
      if (!this.query.select.includes('*')) {
        this.query.select = this.query.select.concat(normalizedColumns);
        this._dedupeSelectColumns();
      }
    }

    return this;
  }

  /**
   * Normalize column specifications to array format
   * @private
   */
  _normalizeColumns(columns) {
    if (typeof columns === 'string') {
      return [columns];
    }

    if (Array.isArray(columns)) {
      return columns;
    }

    if (typeof columns === 'object') {
      // Handle aliased columns: {alias: 'column_name'}
      const result = [];
      for (const [alias, column] of Object.entries(columns)) {
        result.push(`${column} AS ${alias}`);
      }
      return result;
    }

    return ['*'];
  }

  /**
   * De-dupe select columns; also prevents '*, *'
   * @private
   */
  _dedupeSelectColumns() {
    if (!Array.isArray(this.query.select)) return;

    // If '*' exists, collapse to just ['*']
    if (this.query.select.includes('*')) {
      this.query.select = ['*'];
      return;
    }

    // Otherwise de-dupe identical column strings
    const seen = new Set();
    this.query.select = this.query.select.filter(c => {
      if (seen.has(c)) return false;
      seen.add(c);
      return true;
    });
  }

  /**
   * Add parameter and return placeholder
   * NOTE: This Select builder currently emits PostgreSQL-style placeholders ($1..$n).
   * @private
   */
  _addParameter(value) {
    this.parameters.push(value);
    this.parameterIndex++;
    return `$${this.parameterIndex}`;
  }

  /**
   * Build the complete SQL query
   * @private
   */
  _buildQuery(opts = {}) {
    const suppress = !!opts.suppressOrderLimitOffset;

    const buildSingleSelect = () => {
      let sql = 'SELECT ';

      // SELECT clause
      if (this.query.select.length === 0) {
        sql += '*';
      } else {
        sql += this.query.select.join(', ');
      }

      // FROM clause
      if (!this.query.from) {
        throw new Error('FROM clause is required');
      }
      sql += ` FROM ${this.query.from}`;

      // JOIN clauses
      if (this.query.joins.length > 0) {
        sql += ' ' + this.query.joins.join(' ');
      }

      // WHERE clause
      if (this.query.where.length > 0) {
        sql += ' WHERE ' + this.query.where.join(' ');
      }

      // GROUP BY clause
      if (this.query.groupBy.length > 0) {
        sql += ' GROUP BY ' + this.query.groupBy.join(', ');
      }

      // HAVING clause
      if (this.query.having.length > 0) {
        sql += ' HAVING ' + this.query.having.join(' ');
      }

      return sql;
    };

    const baseSql = buildSingleSelect();

    // No unions? behave like before
    const hasUnions = this.query.unions && this.query.unions.length > 0;
    let sql;

    if (!hasUnions) {
      sql = baseSql;

      if (!suppress) {
        if (this.query.orderBy.length > 0) {
          sql += ' ORDER BY ' + this.query.orderBy.join(', ');
        }
        if (this.query.limit !== null) {
          sql += ` LIMIT ${this.query.limit}`;
        }
        if (this.query.offset !== null) {
          sql += ` OFFSET ${this.query.offset}`;
        }
      }

      return sql;
    }

    // With unions: wrap each SELECT then append union parts
    sql = `(${baseSql})`;
    for (const u of this.query.unions) {
      sql += ` ${u.type} (${u.sql})`;
    }

    // Apply ORDER/LIMIT/OFFSET to the whole union query only
    if (!suppress) {
      if (this.query.orderBy.length > 0) {
        sql += ' ORDER BY ' + this.query.orderBy.join(', ');
      }
      if (this.query.limit !== null) {
        sql += ` LIMIT ${this.query.limit}`;
      }
      if (this.query.offset !== null) {
        sql += ` OFFSET ${this.query.offset}`;
      }
    }

    return sql;
  }

  /**
   * Reset the query builder to initial state
   * @returns {Select} - Fluent interface
   */
  reset() {
    this.query = {
      select: [],
      from: null,
      joins: [],
      where: [],
      groupBy: [],
      having: [],
      orderBy: [],
      limit: null,
      offset: null
    };
    this.parameters = [];
    this.parameterIndex = 0;
    return this;
  }

  /**
   * Clone the current query builder
   * @returns {Select} - New Select instance with same state
   */
  clone() {
    const cloned = new Select(this.db);
    cloned.query = JSON.parse(JSON.stringify(this.query));
    cloned.parameters = [...this.parameters];
    cloned.parameterIndex = this.parameterIndex;
    return cloned;
  }
}

module.exports = Select;