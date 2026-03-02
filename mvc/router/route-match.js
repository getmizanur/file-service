// library/mvc/router/route-match.js
/**
 * RouteMatch - Stores information about a matched route
 *
 * Inspired by Zend Framework's RouteMatch
 */
class RouteMatch {

  /**
   * @param {Object} params
   * @param {string|null} matchedRouteName
   */
  constructor(params = {}, matchedRouteName = null) {
    this.params = { ...(params || {}) };
    this.matchedRouteName = matchedRouteName || null;
  }

  /**
   * Get a specific route parameter
   * @param {string} name
   * @param {*} defaultValue
   * @returns {*}
   */
  getParam(name, defaultValue = null) {
    return Object.prototype.hasOwnProperty.call(this.params, name)
      ? this.params[name]
      : defaultValue;
  }

  /**
   * Set a route parameter
   * @param {string} name
   * @param {*} value
   * @returns {RouteMatch}
   */
  setParam(name, value) {
    this.params[name] = value;
    return this;
  }

  /**
   * Remove a route parameter
   * @param {string} name
   * @returns {RouteMatch}
   */
  removeParam(name) {
    if (Object.prototype.hasOwnProperty.call(this.params, name)) {
      delete this.params[name];
    }
    return this;
  }

  /**
   * Get all route parameters (shallow copy)
   * @returns {Object}
   */
  getParams() {
    return { ...this.params };
  }

  /**
   * Replace/merge parameters
   * @param {Object} params
   * @returns {RouteMatch}
   */
  setParams(params) {
    this.params = { ...this.params, ...(params || {}) };
    return this;
  }

  /**
   * @returns {string|null}
   */
  getMatchedRouteName() {
    return this.matchedRouteName;
  }

  /**
   * Alias (often nicer in userland code)
   * @returns {string|null}
   */
  getRouteName() {
    return this.matchedRouteName;
  }

  /**
   * @param {string} routeName
   * @returns {RouteMatch}
   */
  setMatchedRouteName(routeName) {
    this.matchedRouteName = routeName || null;
    return this;
  }

  /**
   * Alias
   * @param {string} routeName
   * @returns {RouteMatch}
   */
  setRouteName(routeName) {
    return this.setMatchedRouteName(routeName);
  }

  /**
   * Convenience method to get module name
   * @returns {string|null}
   */
  getModule() {
    return this.getParam('module');
  }

  /**
   * Convenience method to get controller name
   * @returns {string|null}
   */
  getController() {
    return this.getParam('controller');
  }

  /**
   * Convenience method to get action name
   * @returns {string|null}
   */
  getAction() {
    return this.getParam('action');
  }

  /**
   * Check if a parameter exists
   * @param {string} name
   * @returns {boolean}
   */
  hasParam(name) {
    return Object.prototype.hasOwnProperty.call(this.params, name);
  }

  /**
   * Convert to plain object for serialization
   * @returns {{matchedRouteName: (string|null), params: Object}}
   */
  toObject() {
    return {
      matchedRouteName: this.matchedRouteName,
      params: { ...this.params }
    };
  }

  /**
   * Create RouteMatch from plain object
   * @param {{matchedRouteName?: string, params?: Object}} data
   * @returns {RouteMatch}
   */
  static fromObject(data) {
    const d = data || {};
    return new RouteMatch(d.params || {}, d.matchedRouteName || null);
  }
}

module.exports = RouteMatch;