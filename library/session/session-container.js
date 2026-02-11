class SessionContainer {
  /**
   * Create a new session container (namespace)
   * @param {string} name - The name of the container/namespace
   * @param {object} session - The express-session req.session instance (optional)
   */
  constructor(name = 'Default', session = null) {
    this.name = name;
    this._expressSession = session;
    this._fallbackData = {}; // In-memory fallback storage
  }

  /**
   * Get the data object for this container from the session
   * Always accesses session directly (not cached) to ensure persistence
   * @param {boolean} create - Whether to create the namespace if it doesn't exist
   * @returns {object|null} - Returns null if create is false and namespace doesn't exist
   */
  _getData(create = true) {
    // First priority: Use express-session if provided directly
    if(this._expressSession) {
      // Store namespace data directly at session root level for Redis/file store persistence
      // Use namespace name as key (e.g., session.AuthIdentity = {...})
      if(!this._expressSession.hasOwnProperty(this.name)) {
        if(!create) return null;
        this._expressSession[this.name] = {};
      }
      return this._expressSession[this.name];
    }

    // Second priority: Use express-session from global.locals
    if(typeof global !== 'undefined' && global.locals && global.locals.expressSession) {
      // Store namespace data directly at session root level
      if(!global.locals.expressSession.hasOwnProperty(this.name)) {
        if(!create) return null;
        global.locals.expressSession[this.name] = {};
      }
      return global.locals.expressSession[this.name];
    }

    // Fallback: Use in-memory storage (not persisted)
    return this._fallbackData;
  }

  /**
   * Set a value in the container
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    const data = this._getData(true);
    data[key] = value;

    // Force express-session to detect modification by touching a top-level property
    // This is necessary because express-session with resave:false doesn't detect
    // deep nested object modifications automatically
    if(this._expressSession) {
      this._expressSession._modifiedAt = Date.now();
    }

    return this;
  }

  /**
   * Get a value from the container
   * @param {string} key
   * @param {*} defaultValue
   * @returns {*}
   */
  get(key, defaultValue = null) {
    const data = this._getData(false);
    if(!data) return defaultValue;
    return data.hasOwnProperty(key) ? data[key] : defaultValue;
  }

  /**
   * Check if a key exists in the container
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    const data = this._getData(false);
    if(!data) return false;
    return data.hasOwnProperty(key);
  }

  /**
   * Remove a key from the container
   * @param {string} key
   */
  remove(key) {
    const data = this._getData(false);
    if(data && data.hasOwnProperty(key)) {
      delete data[key];
    }

    // Touch session to force persistence
    if(this._expressSession) {
      this._expressSession._modifiedAt = Date.now();
    }

    return this;
  }

  /**
   * Get all data in the container
   * @returns {object}
   */
  all() {
    const data = this._getData(false);
    if(!data) return {};
    return {
      ...data
    };
  }

  /**
   * Clear all data in the container
   */
  clear() {
    console.log(`[SessionContainer:${this.name}] clear() called`);
    console.log(`[SessionContainer:${this.name}] _expressSession exists:`, !!this._expressSession);
    console.log(`[SessionContainer:${this.name}] global.locals.expressSession exists:`, !!(global.locals && global.locals.expressSession));

    const data = this._getData(false);
    console.log(`[SessionContainer:${this.name}] Data before clear:`, JSON.stringify(data));

    if(data) {
      const keys = Object.keys(data);
      console.log(`[SessionContainer:${this.name}] Clearing ${keys.length} keys:`, keys);
      keys.forEach(key => {
        console.log(`[SessionContainer:${this.name}] Deleting key: ${key}`);
        delete data[key];
      });
    }

    console.log(`[SessionContainer:${this.name}] Data after clear:`, JSON.stringify(data));

    if(this._expressSession) {
      console.log(`[SessionContainer:${this.name}] Session[${this.name}] after clear:`, JSON.stringify(this._expressSession[this.name]));
      this._expressSession._modifiedAt = Date.now();
      console.log(`[SessionContainer:${this.name}] Touched _modifiedAt:`, this._expressSession._modifiedAt);
    }

    return this;
  }

  /**
   * Save the session to persistent storage
   * This is necessary when using express-session with resave:false
   * to ensure session data is persisted before redirects or other responses
   * @returns {Promise<void>}
   */
  async save() {
    if(this._expressSession && typeof this._expressSession.save === 'function') {
      return new Promise((resolve, reject) => {
        this._expressSession.save((err) => {
          if(err) {
            console.error(`[SessionContainer:${this.name}] Save error:`, err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
    // No-op if no express session available
    return Promise.resolve();
  }
}

module.exports = SessionContainer;