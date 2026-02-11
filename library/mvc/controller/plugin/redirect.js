const BasePlugin = require('../base-plugin');
const VarUtil = require('../../../util/var-util');

class Redirect extends BasePlugin {

  constructor(options = {}) {
    super(options);
  }

  toUrl(url = null, params = {}, options = {}) {
    let controller = super.getController();
    let response = controller.getResponse();

    // If url is null or empty, return response as-is
    if(!url) {
      return response;
    }

    // Check if it's already a full URL (http://, https://, //)
    // or a path starting with /
    const isFullUrl = /^(https?:)?\/\//.test(url);
    const isAbsolutePath = url.startsWith('/');

    let redirectUrl = url;

    // If it's not a URL or absolute path, treat it as a route name
    if(!isFullUrl && !isAbsolutePath) {
      let urlPlugin = controller.plugin('url');
      redirectUrl = urlPlugin.fromRoute(url, params);
    }

    response.setRedirect(redirectUrl);

    return response;
  }

  /**
   * Alias for toUrl for consistency
   * @param {string} route - Route name
   * @param {object} params - Route parameters
   * @param {object} options - Additional options
   * @returns {Response}
   */
  toRoute(route = null, params = {}, options = {}) {
    return this.toUrl(route, params, options);
  }

}

module.exports = Redirect;