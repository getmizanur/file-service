// library/session/session-namespace.js
class SessionNamespace {

  constructor(namespace = 'Default', sessionInstance = null) {
    this._namespace = namespace;
    this._session = sessionInstance;

    // In-memory cache (refreshed from session before operations)
    this._data = {};

    // Reserved meta keys (persisted inside namespace data)
    this._META_LOCKED = '__locked';
    this._META_EXPIRY = '__expiry';

    // Load existing data if any
    this._refreshFromSession();
  }

  /**
   * Pull latest namespace data from the session
   */
  _refreshFromSession() {
    if (this._session && typeof this._session.getNamespaceData === 'function') {
      const existing = this._session.getNamespaceData(this._namespace);
      this._data = (existing && typeof existing === 'object') ? { ...existing } : {};
    } else {
      // fallback: keep in-memory
      this._data = (this._data && typeof this._data === 'object') ? this._data : {};
    }
  }

  /**
   * Persist current data to session
   */
  _persistToSession() {
    if (this._session && typeof this._session._setNamespaceData === 'function') {
      this._session._setNamespaceData(this._namespace, this._data);
    }
  }

  /**
   * Get namespace name
   * @returns {string}
   */
  getNamespace() {
    return this._namespace;
  }

  /**
   * Internal: get locked flag (persisted)
   */
  _getLocked() {
    return !!this._data[this._META_LOCKED];
  }

  /**
   * Internal: set locked flag (persisted)
   */
  _setLocked(flag) {
    this._data[this._META_LOCKED] = !!flag;
  }

  /**
   * Internal: get expiry timestamp (persisted)
   */
  _getExpiry() {
    const v = this._data[this._META_EXPIRY];
    return (typeof v === 'number') ? v : null;
  }

  /**
   * Internal: set expiry timestamp (persisted)
   */
  _setExpiry(tsOrNull) {
    if (tsOrNull === null) {
      delete this._data[this._META_EXPIRY];
      return;
    }
    this._data[this._META_EXPIRY] = tsOrNull;
  }

  /**
   * Check if namespace has expired
   * @returns {boolean}
   */
  _isExpired() {
    const expiry = this._getExpiry();
    if (expiry === null) return false;

    const expired = Date.now() > expiry;
    if (expired) {
      // Expiry should clear regardless of lock.
      this._clearInternal(true);
    }
    return expired;
  }

  /**
   * Internal clear; bypassLock used for expiry.
   */
  _clearInternal(bypassLock = false) {
    if (!bypassLock && this._getLocked()) {
      throw new Error(`Session namespace '${this._namespace}' is locked`);
    }

    // preserve meta if bypassLock? For expiry, we should remove meta too.
    this._data = {};
    this._persistToSession();
  }

  /**
   * Set a value in this namespace
   * @param {string} name
   * @param {*} value
   * @returns {SessionNamespace}
   */
  _isReservedKey(name) {
    return name === this._META_LOCKED || name === this._META_EXPIRY;
  }

  set(name, value) {
    this._refreshFromSession();

    if (this._getLocked()) {
      throw new Error(`Session namespace '${this._namespace}' is locked`);
    }

    if (this._isReservedKey(name)) {
      throw new Error(`Key '${name}' is reserved for internal use in namespace '${this._namespace}'`);
    }

    this._data[name] = value;
    this._persistToSession();
    return this;
  }

  /**
   * Get a value from this namespace
   * @param {string} name
   * @param {*} defaultValue
   * @returns {*}
   */
  get(name, defaultValue = null) {
    this._refreshFromSession();

    if (this._isExpired()) {
      return defaultValue;
    }

    if (this._isReservedKey(name)) {
      return defaultValue;
    }

    return Object.prototype.hasOwnProperty.call(this._data, name)
      ? this._data[name]
      : defaultValue;
  }

  /**
   * Check if a key exists in this namespace
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    this._refreshFromSession();

    if (this._isExpired()) {
      return false;
    }

    if (this._isReservedKey(name)) {
      return false;
    }

    return Object.prototype.hasOwnProperty.call(this._data, name);
  }

  /**
   * Remove a key from this namespace
   * @param {string} name
   * @returns {SessionNamespace}
   */
  remove(name) {
    this._refreshFromSession();

    if (this._getLocked()) {
      throw new Error(`Session namespace '${this._namespace}' is locked`);
    }

    if (this._isReservedKey(name)) {
      throw new Error(`Key '${name}' is reserved for internal use in namespace '${this._namespace}'`);
    }

    if (Object.prototype.hasOwnProperty.call(this._data, name)) {
      delete this._data[name];
      this._persistToSession();
    }

    return this;
  }

  /**
   * Get all data in this namespace (excluding meta by default)
   * @param {boolean} includeMeta
   * @returns {Object}
   */
  getAll(includeMeta = false) {
    this._refreshFromSession();

    if (this._isExpired()) {
      return {};
    }

    const out = { ...this._data };

    if (!includeMeta) {
      delete out[this._META_LOCKED];
      delete out[this._META_EXPIRY];
    }

    return out;
  }

  /**
   * Clear all data in this namespace
   * @returns {SessionNamespace}
   */
  clear() {
    this._refreshFromSession();
    this._clearInternal(false);
    return this;
  }

  /**
   * Lock this namespace (prevent writes)
   * @returns {SessionNamespace}
   */
  lock() {
    this._refreshFromSession();
    this._setLocked(true);
    this._persistToSession();
    return this;
  }

  /**
   * Unlock this namespace (allow writes)
   * @returns {SessionNamespace}
   */
  unlock() {
    this._refreshFromSession();
    this._setLocked(false);
    this._persistToSession();
    return this;
  }

  /**
   * Check if namespace is locked
   * @returns {boolean}
   */
  isLocked() {
    this._refreshFromSession();
    return this._getLocked();
  }

  /**
   * Set expiry time for this namespace
   * @param {number} seconds Number of seconds from now
   * @returns {SessionNamespace}
   */
  setExpirationSeconds(seconds) {
    this._refreshFromSession();
    const expiry = Date.now() + (seconds * 1000);
    this._setExpiry(expiry);
    this._persistToSession();
    return this;
  }

  /**
   * Set expiry hops for this namespace (simplified - time-based)
   * @param {number} hops
   * @param {number} hopSeconds
   * @returns {SessionNamespace}
   */
  setExpirationHops(hops, hopSeconds = 300) {
    return this.setExpirationSeconds(hops * hopSeconds);
  }

  /**
   * Clear expiration
   * @returns {SessionNamespace}
   */
  clearExpiration() {
    this._refreshFromSession();
    this._setExpiry(null);
    this._persistToSession();
    return this;
  }

  /**
   * Get keys in this namespace (excluding meta)
   * @param {boolean} includeMeta
   * @returns {Array}
   */
  getKeys(includeMeta = false) {
    const data = this.getAll(includeMeta);
    return Object.keys(data);
  }

  /**
   * Iterator support
   */
  [Symbol.iterator]() {
    const entries = Object.entries(this.getAll(false));
    let index = 0;

    return {
      next: () => {
        if (index < entries.length) {
          return { value: entries[index++], done: false };
        }
        return { done: true };
      }
    };
  }

  /**
   * Save the underlying session (if supported)
   */
  async save() {
    if (this._session && typeof this._session.save === 'function') {
      return this._session.save();
    }
    return Promise.resolve();
  }

  /**
   * Convert to JSON
   * @returns {Object}
   */
  toJSON() {
    this._refreshFromSession();
    return {
      namespace: this._namespace,
      data: this.getAll(true),
      locked: this._getLocked(),
      expiry: this._getExpiry()
    };
  }

  // Magic style methods (kept for legacy)
  __get(name) { return this.get(name); }
  __set(name, value) { this.set(name, value); }
  __isset(name) { return this.has(name); }
  __unset(name) { this.remove(name); }
}

module.exports = SessionNamespace;