const SessionNamespace = require('./session-namespace');
const SessionSecurity = require('./session-security');

class Session {

  static _started = false;
  static _sessionId = null;
  static _sessionData = {};
  static _options = {};
  static _namespaces = new Map();
  static _currentRequest = null;
  static _security = new SessionSecurity();

  /**
   * Start session with request object
   * @param {Object} req - Express request object  
   * @param {Object} options - Session options
   * @returns {boolean} - Success status
   */
  static start(req = null, options = {}) {
    if(this._started && this._currentRequest === req) {
      return this;
    }

    // Store reference to current request
    this._currentRequest = req;

    // Initialize session data from express-session if available
    if(req && req.session) {
      this._sessionData = req.session.customData || {};
      this._sessionId = req.sessionID;
      // Ensure global.locals.session structure exists
      if(global.locals === undefined) {
        global.locals = {};
      }
      if(!global.locals.session) {
        global.locals.session = {
          initialized: true,
          data: {},
          id: null
        };
      }
      global.locals.session.id = req.sessionID;
    } else {
      // Fallback to global session storage for compatibility
      if(global.locals === undefined) {
        global.locals = {};
      }

      if(!global.locals.session) {
        global.locals.session = {
          initialized: true,
          data: {},
          id: null
        };
      }

      this._sessionData = global.locals.session.data || {};
      this._sessionId = global.locals.session.id;
    }

    this._options = Object.assign({
      name: 'JSSESSIONID', // Default session name for JavaScript framework
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

  /**
   * Check if session is started
   * @returns {boolean}
   */
  static isStarted() {
    return this._started;
  }

  /**
   * Get session ID
   * @returns {string|null}
   */
  static getId() {
    return this._sessionId || global.locals?.session?.id || null;
  }

  /**
   * Set session ID
   * @param {string} sessionId
   */
  static setId(sessionId) {
    this._sessionId = sessionId;
    if(global.locals && global.locals.session) {
      global.locals.session.id = sessionId;
    }
    return this;
  }

  /**
   * Regenerate session ID
   * @param {boolean} deleteOldSession
   */
  static regenerateId(deleteOldSession = false) {
    if(!this._started) {
      throw new Error('Session not started');
    }

    // Generate new session ID (simplified for demo)
    const newId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    if(deleteOldSession) {
      this.destroy();
      this._sessionData = {};
    }

    this.setId(newId);
    return this;
  }

  /**
   * Destroy session
   */
  static destroy() {
    this._sessionData = {};
    this._namespaces.clear();

    if(global.locals && global.locals.session) {
      global.locals.session.data = {};
    }

    return this;
  }

  /**
   * Write and close session
   */
  static writeClose() {
    if(global.locals && global.locals.session) {
      global.locals.session.data = this._sessionData;
      global.locals.session.id = this._sessionId;
    }
    return this;
  }

  /**
   * Get session namespace
   * @param {string} namespace
   * @param {boolean} singleInstance
   * @returns {SessionNamespace}
   */
  static getNamespace(namespace = 'Default', singleInstance = true) {
    if(!this._started) {
      this.start();
    }

    if(singleInstance && this._namespaces.has(namespace)) {
      return this._namespaces.get(namespace);
    }

    const namespaceInstance = new SessionNamespace(namespace, this);

    if(singleInstance) {
      this._namespaces.set(namespace, namespaceInstance);
    }

    return namespaceInstance;
  }

  /**
   * Set value in default namespace
   * @param {string} name
   * @param {*} value
   */
  static set(name, value) {
    if(!this._started) {
      console.warn('Session not started, auto-starting without request object');
      this.start();
    }

    if(!this._sessionData['Default']) {
      this._sessionData['Default'] = {};
    }

    this._sessionData['Default'][name] = value;

    // Persist to express-session if available
    if(this._currentRequest && this._currentRequest.session) {
      if(!this._currentRequest.session.customData) {
        this._currentRequest.session.customData = {};
      }
      if(!this._currentRequest.session.customData['Default']) {
        this._currentRequest.session.customData['Default'] = {};
      }
      this._currentRequest.session.customData['Default'][name] = value;
    }

    // Keep backward compatibility with existing session
    if(global.locals && global.locals.session) {
      global.locals.session[name] = value;
    }

    return this;
  }

  /**
   * Get value from default namespace
   * @param {string} name
   * @param {*} defaultValue
   * @returns {*}
   */
  static get(name, defaultValue = null) {
    if(!this._started) {
      return defaultValue;
    }

    // Try to get from express-session first
    if(this._currentRequest && this._currentRequest.session && this._currentRequest.session.customData) {
      const sessionData = this._currentRequest.session.customData;
      if(sessionData['Default'] && sessionData['Default'].hasOwnProperty(name)) {
        return sessionData['Default'][name];
      }
    }

    // Fallback to internal session data
    if(this._sessionData['Default'] && this._sessionData['Default'].hasOwnProperty(name)) {
      return this._sessionData['Default'][name];
    }

    // Backward compatibility check
    if(global.locals && global.locals.session && global.locals.session.hasOwnProperty(name)) {
      return global.locals.session[name];
    }

    return defaultValue;
  }

  /**
   * Check if key exists in default namespace
   * @param {string} name
   * @returns {boolean}
   */
  static has(name) {
    if(!this._started) {
      return false;
    }

    return (this._sessionData['Default'] && this._sessionData['Default'].hasOwnProperty(name)) ||
      (global.locals && global.locals.session && global.locals.session.hasOwnProperty(name));
  }

  /**
   * Remove key from default namespace
   * @param {string} name
   */
  static remove(name) {
    if(!this._started) {
      return this;
    }

    if(this._sessionData['Default'] && this._sessionData['Default'].hasOwnProperty(name)) {
      delete this._sessionData['Default'][name];
    }

    // Backward compatibility
    if(global.locals && global.locals.session && global.locals.session.hasOwnProperty(name)) {
      delete global.locals.session[name];
    }

    return this;
  }

  /**
   * Get all session data
   * @returns {Object}
   */
  static all() {
    // Return a copy of session data, not the raw object
    return Object.assign({}, this._sessionData);
  }

  /**
   * Get session data for a specific namespace
   * @param {string} namespace
   * @returns {Object}
   */
  static getNamespaceData(namespace) {
    return this._sessionData[namespace] || {};
  }

  /**
   * Set session data for a specific namespace (internal use)
   * @param {string} namespace
   * @param {Object} data
   */
  static _setNamespaceData(namespace, data) {
    if(!this._started) {
      this.start();
    }

    this._sessionData[namespace] = data;
    return this;
  }

  /**
   * Check if session is initialized (backward compatibility)
   * @returns {boolean}
   */
  static isInitialized() {
    return this._started && (
      (global.locals && global.locals.session && global.locals.session.initialized) ||
      Object.keys(this._sessionData).length > 0
    );
  }

  /**
   * Get session options
   * @returns {Object}
   */
  static getOptions() {
    return {
      ...this._options
    };
  }

  /**
   * Set session option
   * @param {string} name
   * @param {*} value
   */
  static setOption(name, value) {
    this._options[name] = value;
    return this;
  }

  /**
   * Get save path (for compatibility)
   * @returns {string}
   */
  static getSavePath() {
    return this._options.savePath || '/tmp';
  }

  /**
   * Set save path (for compatibility)
   * @param {string} path
   */
  static setSavePath(path) {
    return this.setOption('savePath', path);
  }

  /**
   * Get session name
   * @returns {string}
   */
  static getName() {
    return this._options.name || 'JSSESSIONID';
  }

  /**
   * Set session name
   * @param {string} name
   */
  static setName(name) {
    return this.setOption('name', name);
  }

  /**
   * Create a signed session ID for URL propagation
   * @param {string} sessionId - Session ID to sign (optional, uses current if not provided)
   * @returns {string} Signed session ID
   */
  static createSignedId(sessionId = null) {
    const id = sessionId || this.getId();
    if(!id) return '';
    return this._security.signSessionId(id);
  }

  /**
   * Verify a signed session ID from URL parameter
   * @param {string} signedSessionId - Signed session ID to verify
   * @returns {string|null} Original session ID if valid, null if invalid
   */
  static verifySignedId(signedSessionId) {
    return this._security.verifySessionId(signedSessionId);
  }

  /**
   * Validate session ID format
   * @param {string} sessionId - Session ID to validate
   * @returns {boolean} True if valid format
   */
  static isValidIdFormat(sessionId) {
    return this._security.isValidSessionIdFormat(sessionId);
  }

  /**
   * Generate secure token for additional validation
   * @param {string} sessionId - Session ID to use for token generation
   * @param {string} userAgent - User agent string for additional security
   * @returns {string} Secure token
   */
  static generateSecureToken(sessionId = null, userAgent = '') {
    const id = sessionId || this.getId();
    return this._security.generateSecureToken(id, userAgent);
  }
}

module.exports = Session;