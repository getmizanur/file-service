// library/mvc/controller/plugin/session.js
const Session = require('../../../session/session');
const BasePlugin = require('../base-plugin');

/**
 * Session Plugin for Controllers
 * Provides easy access to session functionality in controllers.
 */
class SessionPlugin extends BasePlugin {

  constructor(options = {}) {
    super(options);
    this.defaultNamespace = options.defaultNamespace || 'Default';
  }

  /**
   * Resolve Express request from the framework Request wrapper.
   * Returns null if not available.
   */
  _getExpressRequest() {
    const controller = this.getController ? this.getController() : null;
    if (!controller || typeof controller.getRequest !== 'function') return null;

    const req = controller.getRequest();
    if (!req) return null;

    // Preferred: wrapper exposes getExpressRequest()
    if (typeof req.getExpressRequest === 'function') {
      return req.getExpressRequest();
    }

    // Fallback: wrapper may store it directly
    if (req.expressRequest) return req.expressRequest;

    return null;
  }

  /**
   * Start session if not already started.
   * IMPORTANT: Session.start expects (expressReq, options).
   *
   * @param {Object} options
   * @returns {SessionPlugin}
   */
  start(options = {}) {
    const expressReq = this._getExpressRequest();

    if (expressReq) {
      Session.start(expressReq, options);
    } else {
      // Legacy fallback: start without request (in-memory only)
      Session.start(null, options);
    }

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

    // ensure started (best effort)
    if (!Session.isStarted()) {
      this.start();
    }

    return Session.getNamespace(namespace, singleInstance);
  }

  /**
   * Default namespace get
   */
  get(name, defaultValue = null) {
    if (!Session.isStarted()) this.start();
    return Session.get(name, defaultValue);
  }

  /**
   * Default namespace set
   */
  set(name, value) {
    if (!Session.isStarted()) this.start();
    Session.set(name, value);
    return this;
  }

  has(name) {
    if (!Session.isStarted()) this.start();
    return Session.has(name);
  }

  remove(name) {
    if (!Session.isStarted()) this.start();
    Session.remove(name);
    return this;
  }

  /**
   * Persist session (express-session), useful when resave:false
   */
  async save() {
    if (!Session.isStarted()) this.start();
    if (typeof Session.save === 'function') {
      await Session.save();
    }
    return this;
  }

  getId() {
    if (!Session.isStarted()) this.start();
    return Session.getId();
  }

  setId(sessionId) {
    if (!Session.isStarted()) this.start();
    Session.setId(sessionId);
    return this;
  }

  regenerateId(deleteOldSession = false) {
    if (!Session.isStarted()) this.start();
    Session.regenerateId(deleteOldSession);
    return this;
  }

  destroy() {
    if (!Session.isStarted()) this.start();
    Session.destroy();
    return this;
  }

  isStarted() {
    return Session.isStarted();
  }

  all() {
    if (!Session.isStarted()) this.start();
    return Session.all();
  }

  writeClose() {
    if (!Session.isStarted()) this.start();
    Session.writeClose();
    return this;
  }

  // Convenience namespaces (unchanged)
  user() { return this.getNamespace('User'); }
  auth() { return this.getNamespace('Auth'); }
  flash() { return this.getNamespace('FlashMessenger'); }
  form() { return this.getNamespace('Form'); }
}

module.exports = SessionPlugin;