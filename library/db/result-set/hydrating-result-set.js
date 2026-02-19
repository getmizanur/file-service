// library/db/result-set/hydrating-result-set.js
/**
 * HydratingResultSet (ZF2-inspired)
 *
 * Uses a hydrator to convert each row into a cloned object prototype.
 *
 * Improvements:
 * - Memoizes hydrated results (toArray hydrates once per initialize)
 * - current()/first() do not hydrate all rows unnecessarily
 * - get(index) hydrates a single row
 */
class HydratingResultSet {
  constructor(hydrator, objectPrototype) {
    if (!hydrator) throw new Error('HydratingResultSet requires a hydrator');
    if (!objectPrototype) throw new Error('HydratingResultSet requires an object prototype');

    this._hydrator = hydrator;
    this._prototype = objectPrototype;

    this._rows = [];

    // Cache hydrated results to avoid re-hydrating on every call
    this._hydrated = null;           // Array of hydrated objects
    this._hydratedIndexCache = null; // Map<number, object> for single-row hydration
  }

  _resetCache() {
    this._hydrated = null;
    this._hydratedIndexCache = null;
  }

  setHydrator(hydrator) {
    if (!hydrator) throw new Error('HydratingResultSet requires a hydrator');
    this._hydrator = hydrator;
    this._resetCache();
    return this;
  }

  setObjectPrototype(proto) {
    if (!proto) throw new Error('HydratingResultSet requires an object prototype');
    this._prototype = proto;
    this._resetCache();
    return this;
  }

  getHydrator() {
    return this._hydrator;
  }

  getObjectPrototype() {
    return this._prototype;
  }

  getRows() {
    return this._rows;
  }

  initialize(rows) {
    this._rows = Array.isArray(rows) ? rows : [];
    this._resetCache();
    return this;
  }

  /**
   * Hydrate a single raw row into a cloned prototype.
   */
  hydrateRow(row) {
    const obj = this._clonePrototype();
    return this._hydrator.hydrate(row, obj);
  }

  /**
   * Get a hydrated object at a given index without hydrating all rows.
   */
  get(index) {
    if (index == null) return null;
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0 || i >= this._rows.length) return null;

    // If full array already hydrated, return from it
    if (Array.isArray(this._hydrated)) {
      return this._hydrated[i] ?? null;
    }

    // Otherwise, hydrate just this index and cache per-index
    if (!this._hydratedIndexCache) this._hydratedIndexCache = new Map();
    if (this._hydratedIndexCache.has(i)) return this._hydratedIndexCache.get(i);

    const hydrated = this.hydrateRow(this._rows[i]);
    this._hydratedIndexCache.set(i, hydrated);
    return hydrated;
  }

  /**
   * Backwards compatible: return the first hydrated row or null.
   * (Now efficient — does not hydrate everything.)
   */
  current() {
    return this.get(0);
  }

  /**
   * Convenience alias for current()
   */
  first() {
    return this.get(0);
  }

  /**
   * Hydrate all rows (memoized).
   */
  toArray() {
    if (Array.isArray(this._hydrated)) {
      return this._hydrated;
    }

    // If we hydrated some indices already, reuse them when building the full array
    const indexCache = this._hydratedIndexCache;

    this._hydrated = this._rows.map((row, idx) => {
      if (indexCache && indexCache.has(idx)) {
        return indexCache.get(idx);
      }
      return this.hydrateRow(row);
    });

    // Full cache now exists; per-index cache not needed anymore
    this._hydratedIndexCache = null;

    return this._hydrated;
  }

  count() {
    return this._rows.length;
  }

  _clonePrototype() {
    const proto = this._prototype;

    // If prototype provides clone(), prefer it
    if (typeof proto.clone === 'function') {
      return proto.clone();
    }

    // Shallow clone of instance properties with same prototype chain
    return Object.assign(Object.create(Object.getPrototypeOf(proto)), proto);
  }
}

module.exports = HydratingResultSet;