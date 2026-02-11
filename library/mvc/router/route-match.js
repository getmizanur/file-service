/**
 * RouteMatch - Stores information about a matched route
 *
 * This class encapsulates all information about a matched route including:
 * - Route name
 * - Module, controller, and action names
 * - Route parameters (like slug, id, etc.)
 *
 * Inspired by Zend Framework's RouteMatch
 */
class RouteMatch {

  /**
   * Constructor
   * @param {Object} params - Route parameters (module, controller, action, etc.)
   * @param {string} matchedRouteName - Name of the matched route
   */
  constructor(params = {}, matchedRouteName = null) {
    this.params = {
      ...params
    };
    this.matchedRouteName = matchedRouteName;
  }

  /**
   * Get a specific route parameter
   * @param {string} name - Parameter name (module, controller, action, slug, id, etc.)
   * @param {*} defaultValue - Default value if parameter doesn't exist
   * @returns {*} Parameter value or default
   */
  getParam(name, defaultValue = null) {
    return this.params.hasOwnProperty(name) ? this.params[name] : defaultValue;
  }

  /**
   * Set a route parameter
   * @param {string} name - Parameter name
   * @param {*} value - Parameter value
   * @returns {RouteMatch} For method chaining
   */
  setParam(name, value) {
    this.params[name] = value;
    return this;
  }

  /**
   * Get all route parameters
   * @returns {Object} All parameters
   */
  getParams() {
    return {
      ...this.params
    };
  }

  /**
   * Set multiple parameters at once
   * @param {Object} params - Parameters to set
   * @returns {RouteMatch} For method chaining
   */
  setParams(params) {
    this.params = {
      ...this.params,
      ...params
    };
    return this;
  }

  /**
   * Get the matched route name
   * @returns {string|null} Matched route name
   */
  getMatchedRouteName() {
    return this.matchedRouteName;
  }

  /**
   * Set the matched route name
   * @param {string} routeName - Route name
   * @returns {RouteMatch} For method chaining
   */
  setMatchedRouteName(routeName) {
    this.matchedRouteName = routeName;
    return this;
  }

  /**
   * Convenience method to get module name
   * @returns {string|null} Module name
   */
  getModule() {
    return this.getParam('module');
  }

  /**
   * Convenience method to get controller name
   * @returns {string|null} Controller name
   */
  getController() {
    return this.getParam('controller');
  }

  /**
   * Convenience method to get action name
   * @returns {string|null} Action name
   */
  getAction() {
    return this.getParam('action');
  }

  /**
   * Check if a parameter exists
   * @param {string} name - Parameter name
   * @returns {boolean} True if parameter exists
   */
  hasParam(name) {
    return this.params.hasOwnProperty(name);
  }

  /**
   * Convert to plain object for serialization
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      matchedRouteName: this.matchedRouteName,
      params: {
        ...this.params
      }
    };
  }

  /**
   * Create RouteMatch from plain object
   * @param {Object} data - Plain object with matchedRouteName and params
   * @returns {RouteMatch} New RouteMatch instance
   */
  static fromObject(data) {
    return new RouteMatch(data.params || {}, data.matchedRouteName || null);
  }

}

module.exports = RouteMatch;