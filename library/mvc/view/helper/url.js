const AbstractHelper = require('./abstract-helper');

/**
 * URL Helper for Views
 * Generates URLs from route names and parameters
 */
class Url extends AbstractHelper {

  constructor() {
    super();
    this.routes = null;
    this.serviceManager = null; // Initialize serviceManager
  }

  /**
   * Set ServiceManager instance
   * @param {ServiceManager} serviceManager
   */
  setServiceManager(serviceManager) {
    this.serviceManager = serviceManager;
  }

  /**
   * Load routes configuration from Container
   * @returns {Object} Routes configuration
   */
  _getRoutes() {
    if (this.routes) {
      return this.routes;
    }

    if (this.serviceManager) {
      try {
        const config = this.serviceManager.get('Config');
        if (config && config.router && config.router.routes) {
          this.routes = config.router.routes;
          return this.routes;
        }
      } catch (error) {
        console.error('Failed to load routes from ServiceManager config:', error.message);
        // Continue to fallback if serviceManager failed or didn't have routes
      }
    }

    // Fallback: load from config file if not in Container or ServiceManager
    try {
      const routesConfig = require(global.applicationPath('/application/config/routes.config.js'));
      this.routes = routesConfig.routes || {};
      return this.routes;
    } catch (error) {
      console.error('Failed to load routes configuration from file:', error.message);
      return {};
    }
  }


  /**
   * Generate URL from route name and parameters
   * @param {string} routeName - Name of the route
   * @param {Object} params - Parameters to replace in route pattern
   * @returns {string} Generated URL
   */
  fromRoute(...args) {
    const cleanArgs = this._extractContext(args);
    const name = cleanArgs[0];
    const parameters = cleanArgs[1] || {};

    const routes = this._getRoutes();

    if (!routes.hasOwnProperty(name)) {
      console.warn(`Route '${name}' not found in routes configuration`);
      return '';
    }

    let route = routes[name].route;
    const queryParams = [];

    // Replace provided params
    for (let key in parameters) {
      const regEx = new RegExp(':' + key, 'g');
      if (route.match(regEx)) {
        route = route.replace(regEx, parameters[key]);
      } else {
        // Collect unused params for query string
        queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(parameters[key])}`);
      }
    }

    // Remove optional segments that still contain unreplaced parameters
    // Pattern: (/segment/:param)? or (/segment)?
    route = route.replace(/\(\/[^)]*:[^)]*\)\?/g, '');

    // Remove remaining optional parentheses with no params
    route = route.replace(/\(\/?([^):]*)\)\?/g, '$1');

    // Append query string if any
    if (queryParams.length > 0) {
      const separator = route.includes('?') ? '&' : '?';
      route += separator + queryParams.join('&');
    }

    return route;
  }

  /**
   * Main render method that can be called from templates
   * @param {string} routeName - Name of the route
   * @param {Object} params - Parameters to replace in route pattern
   * @returns {string} Generated URL
   */
  render(...args) {
    return this.fromRoute(...args);
  }

}

module.exports = Url;