// library/mvc/view/helper/url.js
const AbstractHelper = require('./abstract-helper');

/**
 * URL Helper for Views
 * Generates URLs from route names and parameters
 */
class Url extends AbstractHelper {

  constructor() {
    super();
    this.routes = null;
    this.serviceManager = null;
    this.debug = false;
  }

  /**
   * Set ServiceManager instance
   * @param {ServiceManager} serviceManager
   */
  setServiceManager(serviceManager) {
    this.serviceManager = serviceManager;
    return this;
  }

  /**
   * Optional: enable/disable debug logging
   */
  setDebug(enabled) {
    this.debug = !!enabled;
    return this;
  }

  _log(...args) {
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.debug('[UrlHelper]', ...args);
    }
  }

  /**
   * Load routes configuration from ServiceManager Config (preferred),
   * otherwise fallback to config file (legacy).
   * @returns {Object} Routes configuration
   */
  _getRoutes() {
    if (this.routes) return this.routes;

    // Preferred: pull from Config in ServiceManager
    if (this.serviceManager) {
      try {
        const config = this.serviceManager.get('Config');
        if (config && config.router && config.router.routes) {
          this.routes = config.router.routes;
          return this.routes;
        }
      } catch (error) {
        this._log('Failed to load routes from ServiceManager config:', error.message);
      }
    }

    // Fallback: load from routes.config.js (legacy)
    try {
      if (typeof global.applicationPath === 'function') {
        const routesConfig = require(global.applicationPath('/application/config/routes.config.js'));
        this.routes = routesConfig.routes || {};
        return this.routes;
      }
      this._log('global.applicationPath is not defined; skipping file fallback');
      return {};
    } catch (error) {
      this._log('Failed to load routes configuration from file:', error.message);
      return {};
    }
  }

  /**
   * Replace route params :id etc. with provided parameters.
   * Encode each parameter for path safety.
   * @private
   */
  _replacePathParams(route, parameters, queryParams) {
    let out = route;

    // Replace provided params
    for (const key in parameters) {
      if (!Object.prototype.hasOwnProperty.call(parameters, key)) continue;

      const rawVal = parameters[key];

      // For path segments we should encode. Keep slashes encoded as well by default.
      const encodedVal = encodeURIComponent(String(rawVal));

      const regEx = new RegExp(':' + key + '\\b', 'g');
      if (regEx.test(out)) {
        out = out.replace(regEx, encodedVal);
      } else {
        // Collect unused params for query string
        queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(rawVal))}`);
      }
    }

    return out;
  }

  /**
   * Remove optional segments that still contain unreplaced parameters.
   * Keeps your original intent, but slightly safer.
   * @private
   */
  _stripUnresolvedOptionals(route) {
    let out = route;

    // Remove optional segments like "(/something/:param)?"
    out = out.replace(/\(\/[^)]*:[^)]*\)\?/g, '');

    // Remove remaining optional parens "(/something)?"
    out = out.replace(/\((\/?[^)]*)\)\?/g, '$1');

    return out;
  }

  /**
   * Generate URL from route name and parameters
   * @param {string} routeName
   * @param {Object} params
   * @param {Object} options { query: {...}, hash: '...' }
   * @returns {string}
   */
  fromRoute(...args) {
    const { args: cleanArgs, context } = this._extractContext(args);
    const name = cleanArgs[0];
    const parameters = cleanArgs[1] || {};
    const options = cleanArgs[2] || {};

    return this.withContext(context, () => {
      const routes = this._getRoutes();

      if (!name || !Object.prototype.hasOwnProperty.call(routes, name)) {
        this._log(`Route '${name}' not found in routes configuration`);
        return '';
      }

      let route = routes[name].route || '';
      const queryParams = [];

      // Replace path params and collect extra params for query string
      route = this._replacePathParams(route, parameters, queryParams);

      // Strip unresolved optional segments
      route = this._stripUnresolvedOptionals(route);

      // Append query params from options.query
      if (options.query && typeof options.query === 'object') {
        for (const key in options.query) {
          if (!Object.prototype.hasOwnProperty.call(options.query, key)) continue;
          queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(options.query[key]))}`);
        }
      }

      // Append query string if any
      if (queryParams.length > 0) {
        const separator = route.includes('?') ? '&' : '?';
        route += separator + queryParams.join('&');
      }

      if (Object.prototype.hasOwnProperty.call(options, 'hash') && options.hash !== null && options.hash !== undefined) {
        route += '#' + encodeURIComponent(String(options.hash));
      }

      return route;
    });
  }

  /**
   * Main render method (templates call this)
   */
  render(...args) {
    return this.fromRoute(...args);
  }
}

module.exports = Url;