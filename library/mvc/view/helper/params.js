const AbstractHelper = require('./abstract-helper');

/**
 * Params Helper for Views
 * Provides access to Request parameters (Query, Post, Route) in templates
 */
class Params extends AbstractHelper {

  constructor() {
    super();
    this.request = null;
  }

  /**
   * Set Request instance
   * @param {Request} request
   */
  setRequest(request) {
    this.request = request;
  }

  /**
   * Get parameter from Query String
   * @param {string} name - Parameter name
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Parameter value
   */
  fromQuery(name, defaultValue = null) {
    if (!this.request) return defaultValue;
    return this.request.getQuery(name, defaultValue);
  }

  /**
   * Get parameter from POST body
   * @param {string} name - Parameter name
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Parameter value
   */
  fromPost(name, defaultValue = null) {
    if (!this.request) return defaultValue;
    return this.request.getPost(name, defaultValue);
  }

  /**
   * Get parameter from Route match
   * @param {string} name - Parameter name
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Parameter value
   */
  fromRoute(name, defaultValue = null) {
    if (!this.request) return defaultValue;
    return this.request.getParam(name, defaultValue);
  }

  /**
  /*
   * Main render method
   * If called with arguments, tries to find param in order: Route -> Query -> Post
   * If called without arguments, returns the helper instance (for chaining)
   * 
   * @param {string} [name] - Parameter name
   * @param {*} [defaultValue] - Default value
   * @returns {*|Params} Value or Helper instance
   */
  render(...args) {
    // Extract Nunjucks context if present (it's always the last argument)
    const cleanArgs = this._extractContext(args);

    // After extraction, check arguments
    const name = cleanArgs[0] || null;
    const defaultValue = cleanArgs[1] || null;

    // If no name is provided (or it was just the context), return the helper instance
    if (name === null) {
      return this;
    }

    if (!this.request) return defaultValue;

    // aggregated lookup order: Route > Query > Post (typical precedence)
    const routeVal = this.fromRoute(name);
    if (routeVal !== null && routeVal !== undefined && routeVal !== '') return routeVal;

    const queryVal = this.fromQuery(name);
    if (queryVal !== null && queryVal !== undefined && queryVal !== '') return queryVal;

    const postVal = this.fromPost(name);
    if (postVal !== null && postVal !== undefined && postVal !== '') return postVal;

    return defaultValue;
  }

}

module.exports = Params;
