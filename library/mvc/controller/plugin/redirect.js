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

    // If url is null/empty, just return response as-is (legacy behavior)
    if (!url) {
      return response;
    }

    const code = (options && options.code) ? options.code : 302;

    // Full URL: http://, https:// or protocol-relative //
    const isFullUrl = /^(https?:)?\/\//.test(url);

    // Absolute path
    const isAbsolutePath = typeof url === 'string' && url.startsWith('/');

    let redirectUrl = url;

    // Otherwise treat as a route name
    if (!isFullUrl && !isAbsolutePath) {
      const urlPlugin = (typeof controller.plugin === 'function')
        ? controller.plugin('url')
        : null;

      if (!urlPlugin || typeof urlPlugin.fromRoute !== 'function') {
        // Safe fallback: if url plugin isn't available, redirect to "/" rather than crash
        redirectUrl = '/';
      } else {
        redirectUrl = urlPlugin.fromRoute(url, params, options);
      }
    }

    // Prefer Response API (exists in your updated response.js)
    if (typeof response.setRedirect === 'function') {
      response.setRedirect(redirectUrl, code);
    } else {
      // legacy fallback
      if (typeof response.setHeader === 'function') {
        response.setHeader('Location', redirectUrl, true);
      }
      if (typeof response.setHttpResponseCode === 'function') {
        response.setHttpResponseCode(code);
      }
      response.redirected = true;
    }

    return response;
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