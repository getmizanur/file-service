const BaseController = require('./base-controller');

/**
 * BasePlugin - Abstract base class for all controller plugins
 * Provides common plugin functionality and controller integration
 * Controller plugins extend controller capabilities with reusable features
 * like redirect, URL generation, parameter handling, flash messages, etc.
 * Inspired by Zend Framework's controller plugin system
 * All controller plugins should extend this class
 */
class BasePlugin {

  /**
   * Constructor
   * Initializes plugin with null controller reference
   * Controller is injected via setController() by PluginManager
   * @param {Object} options - Configuration options (currently unused)
   */
  constructor(options = {}) {
    this.controller = null;
  }

  /**
   * Set controller instance
   * Injects the controller that this plugin will operate on
   * Validates that the provided controller extends BaseController
   * @param {BaseController} controller - Controller instance
   * @returns {void}
   * @throws {Error} If controller is not a BaseController instance
   */
  setController(controller) {
    if(!(controller instanceof BaseController)) {
      throw new Error(
        'The class is not a BaseController instance.');
    }

    this.controller = controller;
  }

  /**
   * Get controller instance
   * Returns the controller that this plugin operates on
   * Provides access to controller methods like getRequest(),
   * getResponse(), getServiceManager(), etc.
   * @returns {BaseController|null} Controller instance or null if
   *                                 not set
   */
  getController() {
    return this.controller;
  }

  /**
   * Post-dispatch hook
   * Called after controller action execution completes
   * Override in subclasses to perform cleanup, logging, or
   * post-processing
   * Used by framework to execute plugin lifecycle callbacks
   * @returns {void}
   */
  postDispatch() {
    // Override in subclasses
  }

}

module.exports = BasePlugin;