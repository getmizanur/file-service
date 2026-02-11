class SessionNamespace {

  constructor(namespace = 'Default', sessionInstance = null) {
    this._namespace = namespace;
    this._session = sessionInstance;
    this._data = {};
    this._locked = false;
    this._expiry = null;

    // Load existing data if any
    if(this._session) {
      this._data = this._session.getNamespaceData(namespace) || {};
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
   * Set a value in this namespace
   * @param {string} name
   * @param {*} value
   * @returns {SessionNamespace}
   */
  set(name, value) {
    if(this._locked) {
      throw new Error(`Session namespace '${this._namespace}' is locked`);
    }

    this._data[name] = value;

    // Update session storage
    if(this._session) {
      this._session._setNamespaceData(this._namespace, this._data);
    }

    return this;
  }

  /**
   * Get a value from this namespace
   * @param {string} name
   * @param {*} defaultValue
   * @returns {*}
   */
  get(name, defaultValue = null) {
    if(this._isExpired()) {
      return defaultValue;
    }

    return this._data.hasOwnProperty(name) ? this._data[name] : defaultValue;
  }

  /**
   * Check if a key exists in this namespace
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    if(this._isExpired()) {
      return false;
    }

    return this._data.hasOwnProperty(name);
  }

  /**
   * Remove a key from this namespace
   * @param {string} name
   * @returns {SessionNamespace}
   */
  remove(name) {
    if(this._locked) {
      throw new Error(`Session namespace '${this._namespace}' is locked`);
    }

    if(this._data.hasOwnProperty(name)) {
      delete this._data[name];

      // Update session storage
      if(this._session) {
        this._session._setNamespaceData(this._namespace, this._data);
      }
    }

    return this;
  }

  /**
   * Get all data in this namespace
   * @returns {Object}
   */
  getAll() {
    if(this._isExpired()) {
      return {};
    }

    return {
      ...this._data
    };
  }

  /**
   * Clear all data in this namespace
   * @returns {SessionNamespace}
   */
  clear() {
    if(this._locked) {
      throw new Error(`Session namespace '${this._namespace}' is locked`);
    }

    this._data = {};

    // Update session storage
    if(this._session) {
      this._session._setNamespaceData(this._namespace, this._data);
    }

    return this;
  }

  /**
   * Lock this namespace (prevent writes)
   * @returns {SessionNamespace}
   */
  lock() {
    this._locked = true;
    return this;
  }

  /**
   * Unlock this namespace (allow writes)
   * @returns {SessionNamespace}
   */
  unlock() {
    this._locked = false;
    return this;
  }

  /**
   * Check if namespace is locked
   * @returns {boolean}
   */
  isLocked() {
    return this._locked;
  }

  /**
   * Set expiry time for this namespace
   * @param {number} seconds Number of seconds from now
   * @returns {SessionNamespace}
   */
  setExpirationSeconds(seconds) {
    this._expiry = Date.now() + (seconds * 1000);
    return this;
  }

  /**
   * Set expiry hops for this namespace (simplified - just sets time-based expiry)
   * @param {number} hops Number of hops (page requests)
   * @param {number} hopSeconds Seconds per hop (default 300 = 5 minutes per hop)
   * @returns {SessionNamespace}
   */
  setExpirationHops(hops, hopSeconds = 300) {
    return this.setExpirationSeconds(hops * hopSeconds);
  }

  /**
   * Check if namespace has expired
   * @returns {boolean}
   */
  _isExpired() {
    if(this._expiry === null) {
      return false;
    }

    const expired = Date.now() > this._expiry;

    if(expired) {
      this.clear();
    }

    return expired;
  }

  /**
   * Get keys in this namespace
   * @returns {Array}
   */
  getKeys() {
    if(this._isExpired()) {
      return [];
    }

    return Object.keys(this._data);
  }

  /**
   * Get iterator for this namespace (for...of support)
   * @returns {Iterator}
   */
  [Symbol.iterator]() {
    const keys = this.getKeys();
    let index = 0;

    return {
      next: () => {
        if(index < keys.length) {
          const key = keys[index++];
          return {
            value: [key, this._data[key]],
            done: false
          };
        }
        return {
          done: true
        };
      }
    };
  }

  /**
   * Convert to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      namespace: this._namespace,
      data: this.getAll(),
      locked: this._locked,
      expiry: this._expiry
    };
  }

  /**
   * Magic getter for property access
   * @param {string} name
   * @returns {*}
   */
  __get(name) {
    return this.get(name);
  }

  /**
   * Magic setter for property access
   * @param {string} name
   * @param {*} value
   */
  __set(name, value) {
    this.set(name, value);
  }

  /**
   * Magic isset for property access
   * @param {string} name
   * @returns {boolean}
   */
  __isset(name) {
    return this.has(name);
  }

  /**
   * Magic unset for property access
   * @param {string} name
   */
  __unset(name) {
    this.remove(name);
  }
}

module.exports = SessionNamespace;