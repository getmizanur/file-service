// library/session/session.js
const SessionNamespace = require('./session-namespace');
const SessionSecurity = require('./session-security');

class Session {
  static _started = false;
  static _sessionId = null;
  static _sessionData = {};
  static _options = {};
  static _namespaces = new Map();
  static _currentRequest = null;

  // Create security with a safe dev fallback (do NOT do this silently in prod)
  static _security = (() => {
    try {
      return new SessionSecurity({ allowInsecureDefaultSecret: true });
    } catch (e) {
      // As an absolute last resort, keep things working (but warn)
      console.warn('[Session] SessionSecurity init failed:', e.message);
      return null;
    }
  })();

  // ----------------------------
  // Internal helpers
  // ----------------------------

  static _ensureGlobalLocals() {
    if (global.locals === undefined) global.locals = {};
    if (!global.locals.session) {
      global.locals.session = { initialized: true, data: {}, id: null };
    }
  }

  /**
   * Get canonical storage (Express session customData if available).
   * Falls back to global.locals.session.data (legacy).
   */
  static _getStore(create = true) {
    // Express session store
    if (this._currentRequest && this._currentRequest.session) {
      if (!this._currentRequest.session.customData) {
        if (!create) return null;
        this._currentRequest.session.customData = {};
      }
      return this._currentRequest.session.customData;
    }

    // Legacy fallback
    this._ensureGlobalLocals();
    if (!global.locals.session.data) {
      if (!create) return null;
      global.locals.session.data = {};
    }
    return global.locals.session.data;
  }

  static _syncLocalCacheFromStore() {
    const store = this._getStore(false);
    this._sessionData = (store && typeof store === 'object') ? store : {};
  }

  static _syncStoreFromLocalCache() {
    const store = this._getStore(true);
    // overwrite store reference safely
    // (express-session notices nested mutations; but we keep consistent behaviour)
    Object.keys(store).forEach(k => delete store[k]);
    Object.assign(store, this._sessionData);
  }

  // ----------------------------
  // Lifecycle
  // ----------------------------

  /**
   * Start session with request object
   * @param {Object} req - Express request object
   * @param {Object} options - Session options
   * @returns {Session}
   */
  static start(req = null, options = {}) {
    if (this._started && this._currentRequest === req) {
      return this;
    }

    this._currentRequest = req || null;

    // Determine session id & store
    if (req && req.session) {
      this._sessionId = req.sessionID || null;
    } else {
      this._ensureGlobalLocals();
      this._sessionId = global.locals.session.id || null;
    }

    // Canonical store
    const store = this._getStore(true);
    this._sessionData = (store && typeof store === 'object') ? store : {};

    // Legacy global locals metadata (id only)
    this._ensureGlobalLocals();
    global.locals.session.id = this._sessionId;

    this._options = Object.assign({
      name: 'JSSESSIONID',
      regenerateId: false,
      strictMode: true,
      cookieLifetime: 0,
      cookiePath: '/',
      cookieDomain: '',
      cookieSecure: false,
      cookieHttpOnly: true
    }, options);

    this._started = true;
    return this;
  }

  static isStarted() {
    return this._started;
  }

  static isInitialized() {
    return this._started && (
      (global.locals && global.locals.session && global.locals.session.initialized) ||
      (this._sessionData && Object.keys(this._sessionData).length > 0)
    );
  }

  // ----------------------------
  // Identity
  // ----------------------------

  static getId() {
    if (this._sessionId) return this._sessionId;
    return global.locals?.session?.id || null;
  }

  static setId(sessionId) {
    this._sessionId = sessionId || null;
    this._ensureGlobalLocals();
    global.locals.session.id = this._sessionId;

    // If express-session exists, we cannot safely set req.sessionID directly;
    // sessionID is managed by the store. We keep local id for signing only.
    return this;
  }

  static regenerateId(deleteOldSession = false) {
    if (!this._started) {
      throw new Error('Session not started');
    }

    // NOTE: In real express-session you would call req.session.regenerate().
    // Here we keep legacy behaviour for non-express fallback.
    const newId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);

    if (deleteOldSession) {
      this.destroy();
      this._sessionData = {};
      this._syncStoreFromLocalCache();
    }

    this.setId(newId);
    return this;
  }

  static destroy() {
    this._namespaces.clear();

    // Clear canonical store
    const store = this._getStore(false);
    if (store && typeof store === 'object') {
      Object.keys(store).forEach(k => delete store[k]);
    }

    this._sessionData = {};
    this._ensureGlobalLocals();
    global.locals.session.data = {};
    return this;
  }

  static writeClose() {
    // Keep cache/store aligned
    this._syncStoreFromLocalCache();
    this._ensureGlobalLocals();
    global.locals.session.data = this._sessionData;
    global.locals.session.id = this._sessionId;
    return this;
  }

  /**
   * Persist session for express-session (useful when resave:false).
   * @returns {Promise<void>}
   */
  static async save() {
    if (this._currentRequest && this._currentRequest.session && typeof this._currentRequest.session.save === 'function') {
      return new Promise((resolve, reject) => {
        this._currentRequest.session.save((err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    }
    return Promise.resolve();
  }

  // ----------------------------
  // Namespaces
  // ----------------------------

  static getNamespace(namespace = 'Default', singleInstance = true) {
    if (!this._started) {
      this.start();
    }

    if (singleInstance && this._namespaces.has(namespace)) {
      return this._namespaces.get(namespace);
    }

    const namespaceInstance = new SessionNamespace(namespace, this);

    if (singleInstance) {
      this._namespaces.set(namespace, namespaceInstance);
    }

    return namespaceInstance;
  }

  static getNamespaceData(namespace) {
    if (!this._started) this.start();
    this._syncLocalCacheFromStore();
    return this._sessionData[namespace] || {};
  }

  static _setNamespaceData(namespace, data) {
    if (!this._started) this.start();

    const safeData = (data && typeof data === 'object') ? data : {};
    this._sessionData[namespace] = safeData;

    // Persist to canonical store immediately
    const store = this._getStore(true);
    store[namespace] = safeData;

    return this;
  }

  // ----------------------------
  // Default namespace shortcuts
  // ----------------------------

  static set(name, value) {
    if (!this._started) {
      console.warn('Session not started, auto-starting without request object');
      this.start();
    }

    const store = this._getStore(true);
    if (!store['Default']) store['Default'] = {};
    store['Default'][name] = value;

    // keep local cache aligned
    this._sessionData = store;

    // Legacy: keep global.locals.session.data aligned (not global.locals.session[name])
    this._ensureGlobalLocals();
    global.locals.session.data = store;

    return this;
  }

  static get(name, defaultValue = null) {
    if (!this._started) {
      return defaultValue;
    }

    const store = this._getStore(false) || {};
    const def = store['Default'] || {};

    return Object.prototype.hasOwnProperty.call(def, name)
      ? def[name]
      : defaultValue;
  }

  static has(name) {
    if (!this._started) return false;

    const store = this._getStore(false) || {};
    const def = store['Default'] || {};

    return Object.prototype.hasOwnProperty.call(def, name);
  }

  static remove(name) {
    if (!this._started) return this;

    const store = this._getStore(false);
    if (store && store['Default'] && Object.prototype.hasOwnProperty.call(store['Default'], name)) {
      delete store['Default'][name];
    }

    this._sessionData = store || {};
    this._ensureGlobalLocals();
    global.locals.session.data = this._sessionData;

    return this;
  }

  static all() {
    if (!this._started) return {};
    const store = this._getStore(false) || {};
    // return copy, not reference
    return Object.assign({}, store);
  }

  // ----------------------------
  // Session options
  // ----------------------------

  static getOptions() {
    return { ...this._options };
  }

  static setOption(name, value) {
    this._options[name] = value;
    return this;
  }

  static getSavePath() {
    return this._options.savePath || '/tmp';
  }

  static setSavePath(path) {
    return this.setOption('savePath', path);
  }

  static getName() {
    return this._options.name || 'JSSESSIONID';
  }

  static setName(name) {
    return this.setOption('name', name);
  }

  // ----------------------------
  // Signed session id helpers
  // ----------------------------

  static createSignedId(sessionId = null) {
    if (!this._security) return '';
    const id = sessionId || this.getId();
    if (!id) return '';
    return this._security.signSessionId(id);
  }

  static verifySignedId(signedSessionId) {
    if (!this._security) return null;
    return this._security.verifySessionId(signedSessionId);
  }

  static isValidIdFormat(sessionId) {
    if (!this._security) return false;
    return this._security.isValidSessionIdFormat(sessionId);
  }

  static generateSecureToken(sessionId = null, userAgent = '') {
    if (!this._security) return null;
    const id = sessionId || this.getId();
    if (!id) return null;
    return this._security.generateSecureToken(id, userAgent);
  }

  static verifySecureToken(sessionId, token, issuedAt, userAgent = '', maxAgeMs = 5 * 60 * 1000) {
    if (!this._security) return false;
    return this._security.verifySecureToken(sessionId, token, issuedAt, userAgent, maxAgeMs);
  }
}

module.exports = Session;