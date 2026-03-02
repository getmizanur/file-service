// library/mvc/controller/base-plugin.js
const BaseController = require('./base-controller');

/**
 * BasePlugin - Abstract base class for all controller plugins
 *
 * Clean architecture:
 * - Plugins operate on the controller abstraction (not Express directly).
 * - Controller is injected by PluginManager via setController().
 * - Provide convenience accessors for request/response/services.
 */
class BasePlugin {

  constructor(options = {}) {
    this.controller = null;
    this.options = options || {};
  }

  /**
   * Basic type guard.
   * Prefer instanceof, but also allow duck-typing to avoid issues when
   * BaseController is loaded twice (e.g., monorepo, symlinks, npm links).
   */
  _isControllerLike(obj) {
    if (!obj) return false;

    // strict path
    if (obj instanceof BaseController) return true;

    // duck-typing fallback
    return (
      typeof obj.getRequest === 'function' &&
      typeof obj.getResponse === 'function' &&
      typeof obj.getServiceManager === 'function' &&
      typeof obj.plugin === 'function'
    );
  }

  /**
   * Inject controller instance.
   * @param {BaseController} controller
   * @returns {BasePlugin}
   * @throws {Error}
   */
  setController(controller) {
    if (!this._isControllerLike(controller)) {
      throw new Error('The provided controller is not compatible with BaseController.');
    }

    this.controller = controller;
    return this;
  }

  /**
   * Get controller instance.
   * @returns {BaseController|null}
   */
  getController() {
    return this.controller;
  }

  /**
   * Convenience accessors
   */
  getServiceManager() {
    if (!this.controller) throw new Error('Controller not set on plugin.');
    return this.controller.getServiceManager();
  }

  getApplication() {
    return this.getServiceManager().get('Application');
  }

  getRequest() {
    if (!this.controller) throw new Error('Controller not set on plugin.');
    return this.controller.getRequest();
  }

  getResponse() {
    if (!this.controller) throw new Error('Controller not set on plugin.');
    return this.controller.getResponse();
  }

  getConfig() {
    // Prefer controller.getConfig() if present
    if (this.controller && typeof this.controller.getConfig === 'function') {
      return this.controller.getConfig();
    }
    // Fallback
    return this.getServiceManager().get('Config');
  }

  /**
   * Options support (useful for plugin configuration)
   */
  setOptions(options = {}) {
    this.options = options || {};
    return this;
  }

  getOptions() {
    return this.options || {};
  }

  getOption(key, defaultValue = null) {
    const opts = this.getOptions();
    return Object.prototype.hasOwnProperty.call(opts, key) ? opts[key] : defaultValue;
  }

  /**
   * Lifecycle hooks (optional)
   * Override in subclasses if needed.
   */
  preDispatch() {
    // Override in subclasses
  }

  postDispatch() {
    // Override in subclasses
  }
}

module.exports = BasePlugin;