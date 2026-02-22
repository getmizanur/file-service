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
    return this;
  }

  /**
   * Resolve request:
   * 1) explicit setRequest()
   * 2) nunjucks context: request / req
   * @private
   */
  _getRequest(contextOverride = null) {
    if (this.request) return this.request;

    const ctx = contextOverride || this.nunjucksContext;
    if (!ctx) return null;

    // Support either your framework Request or raw express req if someone passes it
    return ctx.request || ctx.req || null;
  }

  /**
   * Get parameter from Query String
   */
  fromQuery(name, defaultValue = null, contextOverride = null) {
    const req = this._getRequest(contextOverride);
    if (!req) return defaultValue;

    if (typeof req.getQuery === 'function') {
      return req.getQuery(name, defaultValue);
    }

    // express fallback
    if (req.query && Object.prototype.hasOwnProperty.call(req.query, name)) {
      return req.query[name];
    }

    return defaultValue;
  }

  /**
   * Get parameter from POST body
   */
  fromPost(name, defaultValue = null, contextOverride = null) {
    const req = this._getRequest(contextOverride);
    if (!req) return defaultValue;

    if (typeof req.getPost === 'function') {
      return req.getPost(name, defaultValue);
    }

    // express fallback
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, name)) {
      return req.body[name];
    }

    return defaultValue;
  }

  /**
   * Get parameter from Route match
   */
  fromRoute(name, defaultValue = null, contextOverride = null) {
    const req = this._getRequest(contextOverride);
    if (!req) return defaultValue;

    if (typeof req.getParam === 'function') {
      return req.getParam(name, defaultValue);
    }

    // express fallback
    if (req.params && Object.prototype.hasOwnProperty.call(req.params, name)) {
      return req.params[name];
    }

    return defaultValue;
  }

  /**
   * Main render method
   * If called with arguments, tries to find param in order: Route -> Query -> Post
   * If called without arguments, returns the helper instance (for chaining)
   *
   * @param {string} [name] - Parameter name
   * @param {*} [defaultValue] - Default value
   * @returns {*|Params}
   */
  render(...args) {
    const { args: cleanArgs, context } = this._extractContext(args);
    const name = (cleanArgs.length > 0 && cleanArgs[0] !== undefined) ? cleanArgs[0] : null;
    const defaultValue = (cleanArgs.length > 1) ? cleanArgs[1] : null;

    return this.withContext(context, () => {
      if (name === null || name === '') {
        return this;
      }

      const req = this._getRequest(context);
      if (!req) return defaultValue;

      // Route > Query > Post
      const routeVal = this.fromRoute(name, null, context);
      if (routeVal !== null && routeVal !== undefined && routeVal !== '') return routeVal;

      const queryVal = this.fromQuery(name, null, context);
      if (queryVal !== null && queryVal !== undefined && queryVal !== '') return queryVal;

      const postVal = this.fromPost(name, null, context);
      if (postVal !== null && postVal !== undefined && postVal !== '') return postVal;

      return defaultValue;
    });
  }

}

module.exports = Params;