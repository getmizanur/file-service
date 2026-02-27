// library/http/request.js
const { Readable } = require('stream');
const StringUtil = require('../util/string-util');
const VarUtil = require('../util/var-util');

/**
 * Request - HTTP Request wrapper class
 *
 * Clean architecture:
 * - Wraps an Express request (IncomingMessage) as the source of truth for
 *   method/headers/query/body/params/session/url/path etc.
 * - Keeps framework metadata (module/controller/action/routeName/dispatched)
 *   as explicit properties set by the router/bootstrapper.
 * - Remains backward compatible: existing setters still work and override values.
 * - Still a Readable stream: Express request data is forwarded via setExpressRequest().
 */
class Request extends Readable {

  /**
   * @param {Object|null} expressRequest Optional Express req
   * @param {Object} options Optional overrides (legacy)
   */
  constructor(expressRequest = null, options = {}) {
    // Initialise Readable in push-mode
    super();

    this.HTTP_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];

    this.METHOD_GET = "GET";
    this.METHOD_POST = "POST";
    this.METHOD_PUT = "PUT";
    this.METHOD_DELETE = "DELETE";
    this.METHOD_PATCH = "PATCH";
    this.METHOD_HEAD = "HEAD";
    this.METHOD_OPTIONS = "OPTIONS";

    // Express source of truth
    this.expressRequest = null;

    // Framework metadata
    this.dispatched = null;
    this.module = options.module || null;
    this.controller = options.controller || null;
    this.action = options.action || null;
    this.routeName = options.routeName || null;

    /**
     * Optional overrides (legacy/backward compat):
     * If a setter sets one of these, it will override Express-derived values.
     */
    this.method = options.method || null;
    this.query = options.query || null;
    this.post = options.post || null;
    this.headers = options.headers || null;
    this.params = options.params || null;
    this.routePath = options.routePath || null;
    this.url = options.url || null;
    this.path = options.path || null;
    this.session = options.session || null;

    // If expressRequest passed, set it now (wires stream forwarding)
    if (expressRequest) {
      this.setExpressRequest(expressRequest);
    }
  }

  /**
   * Required by Readable. We operate in push-mode.
   */
  _read() {}

  /**
   * Set raw Express request object and wire it as the stream source.
   * @param {Object} req Express request object (IncomingMessage)
   * @returns {Request}
   */
  setExpressRequest(req) {
    this.expressRequest = req;

    if (req) {
      req.on('data',  (chunk) => this.push(chunk));
      req.on('end',   ()      => this.push(null));
      req.on('error', (err)   => this.destroy(err));
    }

    return this;
  }

  getExpressRequest() {
    return this.expressRequest;
  }

  getExpressResponse() {
    return this.expressRequest?.res || null;
  }

  // ----------------------------
  // Framework metadata
  // ----------------------------

  setDispatched(flag = true) {
    this.dispatched = flag ? true : false;
    return this;
  }

  isDispatched() {
    return this.dispatched;
  }

  setModuleName(value) {
    this.module = value;
    return this;
  }

  getModuleName() {
    return this.module;
  }

  setControllerName(value) {
    this.controller = value;
    return this;
  }

  getControllerName() {
    return this.controller;
  }

  setActionName(value) {
    this.action = value;
    return this;
  }

  getActionName() {
    return this.action;
  }

  setRouteName(routeName) {
    this.routeName = routeName;
    return this;
  }

  getRouteName() {
    return this.routeName;
  }

  // ----------------------------
  // HTTP data (derived from Express unless overridden)
  // ----------------------------

  setMethod(value) {
    const upperMethod = StringUtil.strtoupper(value || '');
    if (!this.HTTP_METHODS.includes(upperMethod)) {
      const error = new Error(`Method Not Allowed: ${value}`);
      error.statusCode = 405;
      error.method = value;
      throw error;
    }
    this.method = upperMethod;
    return this;
  }

  getMethod() {
    if (this.method) return this.method;

    const req = this.expressRequest;
    if (req?.method) {
      const m = StringUtil.strtoupper(req.method);
      return m;
    }

    return null;
  }

  setPost(post) {
    this.post = post;
    return this;
  }

  getPost(key, defaultValue = null) {
    // override takes precedence
    const post = VarUtil.isObject(this.post) ? this.post : null;

    // otherwise derive from express
    const reqPost = this.expressRequest?.body;
    const source = post || (VarUtil.isObject(reqPost) ? reqPost : null);

    if (!VarUtil.isObject(source)) {
      return key === null ? {} : defaultValue;
    }

    if (key == null) return source;

    return VarUtil.hasKey(source, key) ? source[key] : defaultValue;
  }

  setQuery(query) {
    this.query = query;
    return this;
  }

  getQuery(key, defaultValue = null) {
    const query = VarUtil.isObject(this.query) ? this.query : null;

    const reqQuery = this.expressRequest?.query;
    const source = query || (VarUtil.isObject(reqQuery) ? reqQuery : null);

    if (!VarUtil.isObject(source)) {
      return key === null ? {} : defaultValue;
    }

    if (key == null) return source;

    return VarUtil.hasKey(source, key) ? source[key] : defaultValue;
  }

  setHeaders(headers) {
    this.headers = headers;
    return this;
  }

  getHeaders(key, defaultValue = null) {
    const headers = VarUtil.isObject(this.headers) ? this.headers : null;

    const reqHeaders = this.expressRequest?.headers;
    const source = headers || (VarUtil.isObject(reqHeaders) ? reqHeaders : null);

    if (!VarUtil.isObject(source)) {
      return key === null ? {} : defaultValue;
    }

    if (key == null) return source;

    return VarUtil.hasKey(source, key) ? source[key] : defaultValue;
  }

  getHeader(key, defaultValue = null) {
    return this.getHeaders(key, defaultValue);
  }

  setParams(params) {
    this.params = params;
    return this;
  }

  getParam(key, defaultValue = null) {
    const params = VarUtil.isObject(this.params) ? this.params : null;

    const reqParams = this.expressRequest?.params;
    const source = params || (VarUtil.isObject(reqParams) ? reqParams : null);

    if (!VarUtil.isObject(source)) {
      return key === null ? {} : defaultValue;
    }

    if (key == null) return source;

    return VarUtil.hasKey(source, key) ? source[key] : defaultValue;
  }

  getParams() {
    const override = VarUtil.isObject(this.params) ? this.params : null;
    const reqParams = this.expressRequest?.params;
    return override || (VarUtil.isObject(reqParams) ? reqParams : {}) || {};
  }

  setRoutePath(routePath) {
    this.routePath = routePath;
    return this;
  }

  getRoutePath() {
    if (this.routePath) return this.routePath;

    const req = this.expressRequest;
    // express route path (when available) else req.path
    return (req?.route?.path) ? req.route.path : (req?.path || null);
  }

  setUrl(url) {
    this.url = url;
    return this;
  }

  getUrl() {
    if (this.url) return this.url;
    return this.expressRequest?.url || null;
  }

  setPath(path) {
    this.path = path;
    return this;
  }

  getPath() {
    if (this.path) return this.path;
    return this.expressRequest?.path || null;
  }

  setSession(session) {
    this.session = session;
    return this;
  }

  getSession() {
    if (this.session) return this.session;
    return this.expressRequest?.session || null;
  }

  // ----------------------------
  // Convenience helpers
  // ----------------------------

  isGet()    { return this.getMethod() === this.METHOD_GET; }
  isPost()   { return this.getMethod() === this.METHOD_POST; }
  isPut()    { return this.getMethod() === this.METHOD_PUT; }
  isDelete() { return this.getMethod() === this.METHOD_DELETE; }
  isPatch()  { return this.getMethod() === this.METHOD_PATCH; }
}

module.exports = Request;