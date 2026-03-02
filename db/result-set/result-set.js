// library/db/result-set/result-set.js
/**
 * ResultSet (ZF2-inspired)
 *
 * Holds DB rows and optionally converts them into objects.
 * Default: returns plain row objects from the adapter.
 *
 * This is intentionally lightweight and backward-compatible with existing code
 * that expects arrays of row objects.
 */
class ResultSet {
  /**
   * @param {Object} options
   * @param {Object|null} options.arrayObjectPrototype - prototype instance to clone per row
   */
  constructor(options = {}) {
    this._rows = [];
    this._prototype = options.arrayObjectPrototype || null;
  }

  setArrayObjectPrototype(proto) {
    this._prototype = proto;
    return this;
  }

  initialize(rows) {
    this._rows = Array.isArray(rows) ? rows : [];
    return this;
  }

  /**
   * Convert to array of rows or hydrated objects.
   */
  toArray() {
    if (!this._prototype) return this._rows;

    return this._rows.map(row => {
      const obj = this._clonePrototype();
      // Shallow assign; for more control use HydratingResultSet
      Object.assign(obj, row);
      return obj;
    });
  }

  current() {
    const arr = this.toArray();
    return arr.length ? arr[0] : null;
  }

  count() {
    return this._rows.length;
  }

  _clonePrototype() {
    // Preserve prototype chain
    const proto = this._prototype;
    return Object.assign(Object.create(Object.getPrototypeOf(proto)), proto);
  }
}

module.exports = ResultSet;
