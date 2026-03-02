// library/authentication/authentication-service.js
// Authentication service inspired by Zend Framework Authentication\AuthenticationService

/**
 * Authentication Service
 * Provides authentication functionality with persistent storage
 */
class AuthenticationService {
  /**
   * Persistent storage handler
   * @type {Object|null}
   */
  storage = null;

  /**
   * Authentication adapter
   * @type {Object|null}
   */
  adapter = null;

  /**
   * Options
   * @type {{ debug: boolean, persistAfterWrite: boolean, persistAfterClear: boolean }}
   */
  options = {
    debug: false,
    // If storage.save() exists, call it after write/clear (useful for express-session resave:false + redirects)
    persistAfterWrite: false,
    persistAfterClear: false
  };

  /**
   * Constructor
   * @param {Object|null} storage - Storage implementation (optional)
   * @param {Object|null} adapter - Authentication adapter (optional)
   * @param {Object} options
   */
  constructor(storage = null, adapter = null, options = {}) {
    this.options = Object.assign({}, this.options, options || {});

    if (storage !== null) {
      this.setStorage(storage);
    }
    if (adapter !== null) {
      this.setAdapter(adapter);
    }
  }

  _log(...args) {
    if (this.options.debug) {
      // eslint-disable-next-line no-console
      console.debug('[AuthenticationService]', ...args);
    }
  }

  /**
   * Returns the persistent storage handler
   * @returns {Object}
   */
  getStorage() {
    if (this.storage === null) {
      throw new Error('No storage adapter has been set');
    }
    return this.storage;
  }

  /**
   * Sets the persistent storage handler
   * @param {Object} storage - Storage implementation
   * @returns {AuthenticationService}
   */
  setStorage(storage) {
    this.storage = storage;
    return this;
  }

  /**
   * Returns the authentication adapter
   * @returns {Object|null}
   */
  getAdapter() {
    return this.adapter;
  }

  /**
   * Sets the authentication adapter
   * @param {Object} adapter - Authentication adapter
   * @returns {AuthenticationService}
   */
  setAdapter(adapter) {
    this.adapter = adapter;
    return this;
  }

  /**
   * Authenticates against the supplied adapter
   * @param {Object|null} adapter - Optional adapter to use (uses stored adapter if not provided)
   * @returns {Promise<Result>}
   */
  async authenticate(adapter = null) {
    if (adapter === null) {
      adapter = this.getAdapter();
    }

    if (!adapter) {
      throw new Error('An adapter must be set or passed prior to calling authenticate()');
    }

    const result = await adapter.authenticate();

    // Clear any existing identity before setting a new one
    if (this.hasIdentity()) {
      await this.clearIdentity(); // may persist, depending on options
    }

    if (result && typeof result.isValid === 'function' && result.isValid()) {
      const storage = this.getStorage();
      storage.write(result.getIdentity());

      if (this.options.persistAfterWrite && storage && typeof storage.save === 'function') {
        await storage.save();
      }
    }

    return result;
  }

  /**
   * Returns true if and only if an identity is available from storage
   * @returns {boolean}
   */
  hasIdentity() {
    const storage = this.getStorage();
    return !storage.isEmpty();
  }

  /**
   * Returns the identity from storage or null if no identity is available
   * @returns {*|null}
   */
  getIdentity() {
    const storage = this.getStorage();
    if (storage.isEmpty()) return null;
    return storage.read();
  }

  /**
   * Clears the identity from persistent storage
   * @returns {Promise<void>}
   */
  async clearIdentity() {
    const storage = this.getStorage();

    this._log('clearIdentity called; hadIdentity=', !storage.isEmpty());

    storage.clear();

    if (this.options.persistAfterClear && typeof storage.save === 'function') {
      await storage.save();
    }

    this._log('clearIdentity complete; hasIdentity=', !storage.isEmpty());
  }
}

module.exports = AuthenticationService;