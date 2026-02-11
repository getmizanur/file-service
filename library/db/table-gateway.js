// library/db/table-gateway.js
class TableGateway {
  constructor({ table, adapter, primaryKey = 'id', entityFactory = null }) {
    this.table = table;
    this.adapter = adapter;
    this.primaryKey = primaryKey;
    this.entityFactory = entityFactory;
    this.Select = require('./sql/select');
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
          if (v === null) return select.where(`${k} IS NULL`);
          if (Array.isArray(v)) return select.where(`${k} IN (?)`, v);
          return select.where(`${k} = ?`, v);
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
    return this.entityFactory ? rows.map(this.entityFactory) : rows;
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
        if (v === null) return builder.where(`${k} IS NULL`);
        if (Array.isArray(v)) return builder.where(`${k} IN (?)`, v);
        return builder.where(`${k} = ?`, v);
      });
    }
  }
}

module.exports = TableGateway;