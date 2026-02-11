// library/authentication/authenticationService.js
// Authentication service based on Zend Framework Authentication\AuthenticationService

const SessionStorage = require('./storage/session-storage');

/**
 * Authentication Service
 * Provides authentication functionality with persistent storage
 */
class AuthenticationService {
  /**
   * Persistent storage handler
   * @type {Object}
   */
  storage = null;

  /**
   * Authentication adapter
   * @type {Object}
   */
  adapter = null;

  /**
   * Constructor
   * @param {Object} storage - Storage implementation (optional)
   * @param {Object} adapter - Authentication adapter (optional)
   */
  constructor(storage = null, adapter = null) {
    if(storage !== null) {
      this.setStorage(storage);
    }
    if(adapter !== null) {
      this.setAdapter(adapter);
    }
  }

  /**
   * Returns the persistent storage handler
   * @returns {Object}
   */
  getStorage() {
    if(this.storage === null) {
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
   * @returns {Object}
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
   * @param {Object} adapter - Optional adapter to use (uses stored adapter if not provided)
   * @returns {Promise<Result>}
   */
  async authenticate(adapter = null) {
    if(adapter === null) {
      adapter = this.getAdapter();
    }

    if(!adapter) {
      throw new Error('An adapter must be set or passed prior to calling authenticate()');
    }

    const result = await adapter.authenticate();

    /**
     * If result is valid, store the identity
     */
    if(this.hasIdentity()) {
      this.clearIdentity();
    }

    if(result.isValid()) {
      this.getStorage().write(result.getIdentity());
    }

    return result;
  }

  /**
   * Returns true if and only if an identity is available from storage
   * @returns {boolean}
   */
  hasIdentity() {
    return !this.getStorage().isEmpty();
  }

  /**
   * Returns the identity from storage or null if no identity is available
   * @returns {*|null}
   */
  getIdentity() {
    const storage = this.getStorage();

    if(storage.isEmpty()) {
      return null;
    }

    return storage.read();
  }

  /**
   * Clears the identity from persistent storage
   * @returns {void}
   */
  clearIdentity() {
    console.log('[AuthenticationService.clearIdentity] Called');
    console.log('[AuthenticationService.clearIdentity] Has identity before clear:', this.hasIdentity());

    const storage = this.getStorage();
    console.log('[AuthenticationService.clearIdentity] Storage obtained:', storage.constructor.name);

    storage.clear();
    console.log('[AuthenticationService.clearIdentity] Storage.clear() called');
    console.log('[AuthenticationService.clearIdentity] Has identity after clear:', this.hasIdentity());
  }
}

module.exports = AuthenticationService;
