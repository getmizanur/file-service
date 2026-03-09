// library/mvc/controller/plugin/redirect.js
const BasePlugin = require('../base-plugin');

class Redirect extends BasePlugin {

  constructor(options = {}) {
    super(options);
  }

  /**
   * Redirect to:
   * - a full URL: https://example.com
   * - a protocol-relative URL: //example.com
   * - an absolute path: /admin
   * - a route name: 'admin.dashboard' (resolved via url plugin)
   *
   * @param {string|null} url
   * @param {object} params
   * @param {object} options
   *   - code: HTTP status code (default 302)
   *   - query: optional query params (passed to url plugin if route)
   *   - fragment: optional hash fragment (passed to url plugin if route)
   * @returns {Response|null}
   */
  toUrl(url = null, params = {}, options = {}) {
    const controller = this.getController ? this.getController() : null;
    if (!controller) return null;

    const response = (typeof controller.getResponse === 'function')
      ? controller.getResponse()
      : null;

    if (!response) return null;
    if (!url) return response;

    const code = (options && options.code) ? options.code : 302;
    const redirectUrl = this._resolveRedirectUrl(url, params, options, controller);

    this._applyRedirect(response, redirectUrl, code);
    return response;
  }

  _resolveRedirectUrl(url, params, options, controller) {
    const isFullUrl = /^(https?:)?\/\//.test(url);
    const isAbsolutePath = typeof url === 'string' && url.startsWith('/');

    if (isFullUrl || isAbsolutePath) return url;

    const urlPlugin = (typeof controller.plugin === 'function')
      ? controller.plugin('url')
      : null;

    if (!urlPlugin || typeof urlPlugin.fromRoute !== 'function') return '/';
    return urlPlugin.fromRoute(url, params, options);
  }

  _applyRedirect(response, redirectUrl, code) {
    if (typeof response.setRedirect === 'function') {
      response.setRedirect(redirectUrl, code);
      return;
    }

    if (typeof response.setHeader === 'function') {
      response.setHeader('Location', redirectUrl, true);
    }
    if (typeof response.setHttpResponseCode === 'function') {
      response.setHttpResponseCode(code);
    }
    response.redirected = true;
  }

  /**
   * Alias for toUrl for consistency.
   * @param {string|null} route
   * @param {object} params
   * @param {object} options
   * @returns {Response|null}
   */
  toRoute(route = null, params = {}, options = {}) {
    return this.toUrl(route, params, options);
  }
}

module.exports = Redirect;