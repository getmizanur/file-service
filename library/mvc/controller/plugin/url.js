const BasePlugin = require('../base-plugin');

class Url extends BasePlugin {

  constructor(options = {}) {
    super(options);
  }

  fromRoute(name, params = {}, options = {}) {
    let config = super.getController().getConfig();
    let routes = config['router']['routes'];

    let route = null;
    if (routes.hasOwnProperty(name)) {
      route = routes[name].route;

      // Replace provided params
      for (let key in params) {
        let regEx = new RegExp(':' + key, 'g');
        route = route.replace(regEx, params[key]);
      }

      // Remove optional segments that still contain unreplaced parameters
      // Pattern: (/segment/:param)? or (/segment)?
      route = route.replace(/\([^)]*:[^)]*\)\?/g, '');

      // Remove remaining optional parentheses with no params
      route = route.replace(/\(\/?([^):]*)\)\?/g, '$1');

      if (options.hasOwnProperty('query') && Object.keys(options.query).length > 0) {
        route += '?' + Object.keys(options.query).map(key => `${key}=${options.query[key]}`).join('&');
      }

      if (options.hasOwnProperty('hash')) {
        route += '#' + options.hash;
      }
    }

    return route;
  }

}

module.exports = Url;