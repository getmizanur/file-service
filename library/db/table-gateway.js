class TableGateway {
  constructor({ table, adapter, primaryKey = 'id', entityFactory = null, resultSet = null, hydrator = null, objectPrototype = null }) {
    this.table = table;
    this.adapter = adapter;
    this.primaryKey = primaryKey;
    this.entityFactory = entityFactory;

    this.resultSet = resultSet;
    this.hydrator = hydrator;
    this.objectPrototype = objectPrototype;
    this.Select = require('./sql/select');
  }

  getAdapter() {
    return this.adapter;
  }

  getTableName() {
    return this.table;
  }

  _buildResultSet(options = {}) {
    // Per-call override takes precedence
    if (options.resultSet) return options.resultSet;

    // If a hydrator + prototype were configured, default to HydratingResultSet
    if (this.hydrator && (options.objectPrototype || this.objectPrototype)) {
      const HydratingResultSet = require('./result-set/hydrating-result-set');
      return new HydratingResultSet(this.hydrator, options.objectPrototype || this.objectPrototype);
    }

    // If a simple prototype was configured, use ResultSet for shallow assign
    if (options.objectPrototype || this.objectPrototype) {
      const ResultSet = require('./result-set/result-set');
      return new ResultSet({ arrayObjectPrototype: options.objectPrototype || this.objectPrototype });
    }

    // No result set
    return null;
  }

  /**
   * Apply a "where object" entry to a builder in a safe, cross-db way.
   * - null => "IS NULL"
   * - array => whereIn(...) if supported, otherwise expands placeholders
   * - scalar => "="
   */
  _applyWhereEntry(builder, key, value) {
    if (value === null) {
      return builder.where(`${key} IS NULL`);
    }

    if (Array.isArray(value)) {
      // Preferred: use builder.whereIn if available
      if (typeof builder.whereIn === 'function') {
        return builder.whereIn(key, value);
      }

      // Fallback: expand placeholders ourselves
      if (!value.length) {
        // IN () is invalid; force no rows
        return builder.where('1 = 0');
      }

      const placeholders = value.map(() => '?').join(', ');
      // if builder supports multiple args, pass as spread
      return builder.where(`${key} IN (${placeholders})`, ...value);
    }

    return builder.where(`${key} = ?`, value);
  }

  async select(spec = null, options = {}) {
    let select;

    const looksLikeSelect =
      spec &&
      typeof spec === 'object' &&
      typeof spec.execute === 'function' &&
      typeof spec.from === 'function' &&
      typeof spec.where === 'function';

    if (looksLikeSelect) {
      select = spec;
    } else {
      select = new this.Select(this.adapter);

      const isCallback = typeof spec === 'function';

      // Default FROM only for non-callback “simple” usage
      if (this.table && !isCallback) {
        select.from({ t: this.table });
      }

      if (isCallback) {
        const maybe = spec(select);
        if (maybe) select = maybe;
      } else if (spec && typeof spec === 'object') {
        // Simple where object
        Object.entries(spec).forEach(([k, v]) => {
          this._applyWhereEntry(select, k, v);
        });
      }

      // Common options
      if (options.order) {
        if (Array.isArray(options.order)) select.order(...options.order);
        else select.order(options.order);
      }
      if (options.limit != null) select.limit(options.limit);
      if (options.offset != null) select.offset(options.offset);
    }

    const rows = await select.execute();

    // Backward compatibility: entityFactory still wins if provided.
    if (this.entityFactory) return rows.map(this.entityFactory);

    const rs = this._buildResultSet(options);
    if (rs) {
      rs.initialize(rows);
      return rs.toArray();
    }

    return rows;
  }

  async get(id) {
    const rows = await this.select({ [this.primaryKey]: id }, { limit: 1 });
    return rows[0] || null;
  }

  async insert(data) {
    const Insert = require('./sql/insert');
    return new Insert(this.adapter).into(this.table).values(data).execute();
  }

  async update(where, data) {
    if (!where) throw new Error(`${this.table}.update() requires a where`);
    const Update = require('./sql/update');
    const update = new Update(this.adapter).table(this.table).set(data);
    this.applyWhere(update, where);
    return update.execute();
  }

  async delete(where) {
    if (!where) throw new Error(`${this.table}.delete() requires a where`);
    const Delete = require('./sql/delete');
    const del = new Delete(this.adapter).from(this.table);
    this.applyWhere(del, where);
    return del.execute();
  }

  async selectSimple(where = null, options = {}) {
    return this.select(select => {
      if (this.table) select.from({ t: this.table });
      if (where) this.applyWhere(select, where);
      if (options.order) select.order(options.order);
      if (options.limit != null) select.limit(options.limit);
      if (options.offset != null) select.offset(options.offset);
      return select;
    });
  }

  applyWhere(builder, where) {
    if (typeof where === 'string') return builder.where(where);

    // callback receives builder so caller can do builder.where(...), join, etc.
    if (typeof where === 'function') return where(builder);

    if (where && typeof where === 'object') {
      Object.entries(where).forEach(([k, v]) => {
        this._applyWhereEntry(builder, k, v);
      });
    }
  }
}

module.exports = TableGateway;