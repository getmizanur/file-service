/**
 * UnionSelect - helper for composing UNION / UNION ALL queries from multiple Select objects.
 *
 * Why this exists when Select already supports .union() / .unionAll():
 * - Provides a clearer API for building a UNION as a first-class SQL object.
 * - Lets you start from multiple Select instances without manually picking a "base" Select.
 *
 * Usage:
 *   const Select = require('./select');
 *   const UnionSelect = require('./union-select');
 *
 *   const s1 = new Select(db).from('t1', ['id']).where('x = ?', 1);
 *   const s2 = new Select(db).from('t2', ['id']).where('y = ?', 2);
 *
 *   const u = new UnionSelect(db, { all: true })
 *     .add(s1)
 *     .add(s2)
 *     .order('id DESC')
 *     .limit(50);
 *
 *   const rows = await u.execute();
 *   // or:
 *   const { rows, rowCount } = await u.executeRaw();
 */
const Select = require('./select');

class UnionSelect {
  /**
   * @param {Object|null} dbAdapter - optional adapter (passed to underlying Select)
   * @param {Object} options
   * @param {boolean} options.all - default union type: true => UNION ALL, false => UNION
   */
  constructor(dbAdapter = null, options = {}) {
    this.db = dbAdapter;
    this.defaultAll = options.all !== undefined ? !!options.all : true;
    this._base = null; // Select
  }

  /**
   * Add a Select (or raw SQL string) into the union.
   * The first added Select becomes the base; subsequent ones are unioned onto it.
   *
   * @param {Select|string} selectOrSql
   * @param {Object} options
   * @param {boolean} options.all - override default union type for this add
   * @returns {UnionSelect}
   */
  add(selectOrSql, options = {}) {
    const all = options.all !== undefined ? !!options.all : this.defaultAll;

    if (!this._base) {
      if (selectOrSql instanceof Select) {
        // Clone so callers can reuse their Select instances safely
        this._base = selectOrSql.clone();
        return this;
      }
      if (typeof selectOrSql === 'string') {
        // A UNION must start with a SELECT; raw SQL can't be a safe base
        throw new Error('UnionSelect.add: first element must be a Select instance (not raw SQL).');
      }
      throw new Error('UnionSelect.add expects a Select instance or SQL string.');
    }

    // From here on, we can accept Select or raw SQL
    if (all) {
      this._base.unionAll(selectOrSql);
    } else {
      this._base.union(selectOrSql);
    }

    return this;
  }

  /**
   * Alias for add(select, { all: false })
   */
  union(selectOrSql) {
    return this.add(selectOrSql, { all: false });
  }

  /**
   * Alias for add(select, { all: true })
   */
  unionAll(selectOrSql) {
    return this.add(selectOrSql, { all: true });
  }

  /**
   * ORDER BY applied to the whole union query.
   */
  order(orderBy) {
    this._ensureBase();
    this._base.order(orderBy);
    return this;
  }

  /**
   * LIMIT applied to the whole union query.
   */
  limit(limit) {
    this._ensureBase();
    this._base.limit(limit);
    return this;
  }

  /**
   * OFFSET applied to the whole union query.
   */
  offset(offset) {
    this._ensureBase();
    this._base.offset(offset);
    return this;
  }

  /**
   * Access the underlying Select if you need advanced Select-only methods.
   * (e.g., group(), having(), etc.)
   */
  getBaseSelect() {
    this._ensureBase();
    return this._base;
  }

  toString() {
    this._ensureBase();
    return this._base.toString();
  }

  __toString() {
    return this.toString();
  }

  getParameters() {
    this._ensureBase();
    return this._base.getParameters();
  }

  /**
   * Normalize adapter results:
   * - legacy adapters might return rows[]
   * - new adapters return { rows, rowCount, insertedId }
   */
  _normalizeResult(result) {
    if (!result) return { rows: [], rowCount: 0, insertedId: null };

    // legacy: adapter returns array of rows
    if (Array.isArray(result)) {
      return { rows: result, rowCount: result.length, insertedId: null };
    }

    // new: adapter returns structured object
    if (typeof result === 'object' && Array.isArray(result.rows)) {
      return {
        rows: result.rows,
        rowCount: typeof result.rowCount === 'number' ? result.rowCount : result.rows.length,
        insertedId: result.insertedId ?? null
      };
    }

    return { rows: [], rowCount: 0, insertedId: null };
  }

  /**
   * Execute and return rows array (Select-like behavior)
   * @returns {Promise<Array>}
   */
  async execute() {
    this._ensureBase();

    // Prefer Select.execute() because it already normalizes and returns rows[]
    if (typeof this._base.execute === 'function') {
      return this._base.execute();
    }

    // Fallback: run via adapter directly
    if (!this.db) {
      throw new Error('Database adapter not set. Cannot execute query.');
    }

    const sql = this.toString();
    const params = this.getParameters();
    const raw = await this.db.query(sql, params);

    return this._normalizeResult(raw).rows;
  }

  /**
   * Execute and return normalized structured result
   * @returns {Promise<{rows:Array,rowCount:number,insertedId:any}>}
   */
  async executeRaw() {
    this._ensureBase();

    // Prefer Select.executeRaw() if present (it returns normalized structured object)
    if (typeof this._base.executeRaw === 'function') {
      return this._base.executeRaw();
    }

    if (!this.db) {
      throw new Error('Database adapter not set. Cannot execute query.');
    }

    const sql = this.toString();
    const params = this.getParameters();
    const raw = await this.db.query(sql, params);

    return this._normalizeResult(raw);
  }

  clone() {
    const c = new UnionSelect(this.db, { all: this.defaultAll });
    if (this._base) c._base = this._base.clone();
    return c;
  }

  _ensureBase() {
    if (!this._base) {
      throw new Error('UnionSelect: no Select has been added yet. Call add(select) first.');
    }
  }
}

module.exports = UnionSelect;