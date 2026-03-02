// library/mvc/controller/plugin/params.js
const BasePlugin = require('../base-plugin');

class Params extends BasePlugin {

  constructor(options = {}) {
    super(options);
  }

  _getRequestSafe() {
    const controller = this.getController ? this.getController() : null;
    if (!controller || typeof controller.getRequest !== 'function') return null;
    return controller.getRequest();
  }

  fromHeader(header = null, defaultValue = null) {
    const request = this._getRequestSafe();
    if (!request || typeof request.getHeader !== 'function') return defaultValue;
    return request.getHeader(header, defaultValue);
  }

  fromPost(param = null, defaultValue = null) {
    const request = this._getRequestSafe();
    if (!request || typeof request.getPost !== 'function') return defaultValue;
    return request.getPost(param, defaultValue);
  }

  fromQuery(param = null, defaultValue = null) {
    const request = this._getRequestSafe();
    if (!request || typeof request.getQuery !== 'function') return defaultValue;
    return request.getQuery(param, defaultValue);
  }

  fromRoute(param = null, defaultValue = null) {
    const request = this._getRequestSafe();
    if (!request || typeof request.getParam !== 'function') return defaultValue;
    return request.getParam(param, defaultValue);
  }

  /**
   * Convenience: search in route params, then query, then post, then headers.
   * Useful for APIs where inputs may come from different places.
   */
  fromAny(param = null, defaultValue = null) {
    if (!param) return defaultValue;

    const route = this.fromRoute(param, undefined);
    if (route !== undefined && route !== null) return route;

    const query = this.fromQuery(param, undefined);
    if (query !== undefined && query !== null) return query;

    const post = this.fromPost(param, undefined);
    if (post !== undefined && post !== null) return post;

    const header = this.fromHeader(param, undefined);
    if (header !== undefined && header !== null) return header;

    return defaultValue;
  }
}

module.exports = Params;