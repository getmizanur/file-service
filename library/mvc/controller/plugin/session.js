const Session = require('../../../session/session');
const BasePlugin = require('../base-plugin');

/**
 * Session Plugin for Controllers
 * Provides easy access to session functionality in controllers
 */
class SessionPlugin extends BasePlugin {

  constructor(options = {}) {
    super(options);

    this.defaultNamespace = options.defaultNamespace || 'Default';
    this._namespaces = new Map();
  }

  /**
   * Start session if not already started
   * @param {Object} options
   * @returns {SessionPlugin}
   */
  start(options = {}) {
    Session.start(options);
    return this;
  }

  /**
   * Get session namespace
   * @param {string} namespace
   * @param {boolean} singleInstance
   * @returns {SessionNamespace}
   */
  getNamespace(namespace = null, singleInstance = true) {
    namespace = namespace || this.defaultNamespace;
    return Session.getNamespace(namespace, singleInstance);
  }

  /**
   * Get value from default namespace
   * @param {string} name
   * @param {*} defaultValue
   * @returns {*}
   */
  get(name, defaultValue = null) {
    return Session.get(name, defaultValue);
  }

  /**
   * Set value in default namespace
   * @param {string} name
   * @param {*} value
   * @returns {SessionPlugin}
   */
  set(name, value) {
    Session.set(name, value);
    return this;
  }

  /**
   * Check if key exists in default namespace
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return Session.has(name);
  }

  /**
   * Remove key from default namespace
   * @param {string} name
   * @returns {SessionPlugin}
   */
  remove(name) {
    Session.remove(name);
    return this;
  }

  /**
   * Get session ID
   * @returns {string|null}
   */
  getId() {
    return Session.getId();
  }

  /**
   * Set session ID
   * @param {string} sessionId
   * @returns {SessionPlugin}
   */
  setId(sessionId) {
    Session.setId(sessionId);
    return this;
  }

  /**
   * Regenerate session ID
   * @param {boolean} deleteOldSession
   * @returns {SessionPlugin}
   */
  regenerateId(deleteOldSession = false) {
    Session.regenerateId(deleteOldSession);
    return this;
  }

  /**
   * Destroy session
   * @returns {SessionPlugin}
   */
  destroy() {
    Session.destroy();
    return this;
  }

  /**
   * Check if session is started
   * @returns {boolean}
   */
  isStarted() {
    return Session.isStarted();
  }

  /**
   * Get all session data
   * @returns {Object}
   */
  all() {
    return Session.all();
  }

  /**
   * Write and close session
   * @returns {SessionPlugin}
   */
  writeClose() {
    Session.writeClose();
    return this;
  }

  /**
   * Convenience method to get/create user namespace
   * @returns {SessionNamespace}
   */
  user() {
    return this.getNamespace('User');
  }

  /**
   * Convenience method to get/create auth namespace
   * @returns {SessionNamespace}
   */
  auth() {
    return this.getNamespace('Auth');
  }

  /**
   * Convenience method to get/create flash messenger namespace
   * @returns {SessionNamespace}
   */
  flash() {
    return this.getNamespace('FlashMessenger');
  }

  /**
   * Convenience method to get/create form namespace
   * @returns {SessionNamespace}
   */
  form() {
    return this.getNamespace('Form');
  }

}

module.exports = SessionPlugin;