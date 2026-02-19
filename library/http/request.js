const { Readable } = require('stream');
const StringUtil = require('../util/string-util');
const VarUtil = require('../util/var-util');

/**
 * Request - HTTP Request wrapper class
 * Encapsulates all HTTP request data including method, URL, query params, POST data, etc.
 * Extends Readable so the wrapper itself can be piped/streamed (e.g. for file uploads)
 * without callers needing to reach for getExpressRequest().
 */
class Request extends Readable {

  constructor(options = {}) {
    // Initialise Readable in push-mode. Stream options (highWaterMark etc.) are
    // separate from the application options object, so we call super() with no args.
    super();
    this.HTTP_METHODS = [
      'GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'
    ];

    this.METHOD_GET = "GET";
    this.METHOD_POST = "POST";
    this.METHOD_PUT = "PUT";
    this.METHOD_DELETE = "DELETE";
    this.METHOD_PATCH = "PATCH";
    this.METHOD_HEAD = "HEAD";
    this.METHOD_OPTIONS = "OPTIONS";

    this.method = options.method || null;
    this.query = options.query || null;
    this.post = options.post || null;
    this.headers = options.headers || null;
    this.dispatched = null;

    this.module = options.module || null;
    this.controller = options.controller || null;
    this.action = options.action || null;

    this.params = null;
    this.routePath = null;
    this.url = null;
    this.path = null;
    this.routeName = null;
    this.session = null; // Express-session req.session object
  }

  /**
   * Set HTTP method
   * @param {string} value - HTTP method (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
   * @returns {Request} For method chaining
   * @throws {Error} If method is not a valid HTTP method (error has statusCode 405)
   */
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

  /**
   * Get HTTP method
   * @returns {string|null} HTTP method
   */
  getMethod() {
    return this.method;
  }

  /**
   * Set module name
   * @param {string} value - Module name
   * @returns {Request} For method chaining
   */
  setModuleName(value) {
    this.module = value;

    return this;
  }

  /**
   * Get module name
   * @returns {string|null} Module name
   */
  getModuleName() {
    return this.module;
  }

  /**
   * Set controller name
   * @param {string} value - Controller name
   * @returns {Request} For method chaining
   */
  setControllerName(value) {
    this.controller = value;

    return this;
  }

  /**
   * Get controller name
   * @returns {string|null} Controller name
   */
  getControllerName() {
    return this.controller;
  }

  /**
   * Set action name
   * @param {string} value - Action name
   * @returns {Request} For method chaining
   */
  setActionName(value) {
    this.action = value;

    return this;
  }

  /**
   * Get action name
   * @returns {string|null} Action name
   */
  getActionName() {
    return this.action;
  }

  /**
   * Set POST data
   * @param {Object} post - POST data object
   * @returns {Request} For method chaining
   */
  setPost(post) {
    this.post = post;

    return this;
  }

  /**
   * Get POST data
   * @param {string|null} key - POST parameter key (null to get all)
   * @param {*} defaultValue - Default value if key doesn't exist
   * @returns {*} POST value or default
   */
  getPost(key, defaultValue = null) {
    if(!VarUtil.isObject(this.post)) {
      return key === null ? {} : defaultValue;
    }

    if(VarUtil.hasKey(this.post, key)) {
      return this.post[key];
    }

    if(key == null) {
      return this.post;
    }

    return defaultValue;
  }

  /**
   * Set query parameters
   * @param {Object} query - Query parameters object
   * @returns {Request} For method chaining
   */
  setQuery(query) {
    this.query = query;

    return this;
  }

  /**
   * Get query parameter
   * @param {string|null} key - Query parameter key (null to get all)
   * @param {*} defaultValue - Default value if key doesn't exist
   * @returns {*} Query value or default
   */
  getQuery(key, defaultValue = null) {
    if(!VarUtil.isObject(this.query)) {
      return key === null ? {} : defaultValue;
    }

    if(VarUtil.hasKey(this.query, key)) {
      return this.query[key];
    }

    if(key == null) {
      return this.query;
    }

    return defaultValue;
  }

  /**
   * Set HTTP headers
   * @param {Object} headers - Headers object
   * @returns {Request} For method chaining
   */
  setHeaders(headers) {
    this.headers = headers;

    return this;
  }

  /**
   * Get HTTP headers
   * @param {string|null} key - Header key (null to get all)
   * @param {*} defaultValue - Default value if key doesn't exist
   * @returns {*} Header value or default
   */
  getHeaders(key, defaultValue = null) {
    if(!VarUtil.isObject(this.headers)) {
      return key === null ? {} : defaultValue;
    }

    if(VarUtil.hasKey(this.headers, key)) {
      return this.headers[key];
    }

    if(key == null) {
      return this.headers;
    }

    return defaultValue;
  }

  /**
   * Get HTTP header (alias for getHeaders)
   * @param {string} key - Header key
   * @param {*} defaultValue - Default value if key doesn't exist
   * @returns {*} Header value or default
   */
  getHeader(key, defaultValue = null) {
    return this.getHeaders(key, defaultValue);
  }

  /**
   * Set route path
   * @param {string} routePath - Route path
   * @returns {Request} For method chaining
   */
  setRoutePath(routePath) {
    this.routePath = routePath;

    return this;
  }

  /**
   * Get route path
   * @returns {string|null} Route path
   */
  getRoutePath() {
    return this.routePath;
  }

  /**
   * Set URL
   * @param {string} url - URL
   * @returns {Request} For method chaining
   */
  setUrl(url) {
    this.url = url;

    return this;
  }

  /**
   * Get URL
   * @returns {string|null} URL
   */
  getUrl() {
    return this.url;
  }

  /**
   * Set path
   * @param {string} path - Path
   * @returns {Request} For method chaining
   */
  setPath(path) {
    this.path = path;

    return this;
  }

  /**
   * Get path
   * @returns {string|null} Path
   */
  getPath() {
    return this.path;
  }

  /**
   * Set route parameters
   * @param {Object} params - Route parameters object
   * @returns {Request} For method chaining
   */
  setParams(params) {
    this.params = params;
    return this;
  }

  /**
   * Get route parameter
   * @param {string|null} key - Parameter key (null to get all)
   * @param {*} defaultValue - Default value if key doesn't exist
   * @returns {*} Parameter value or default
   */
  getParam(key, defaultValue = null) {
    if(!VarUtil.isObject(this.params)) {
      return key === null ? {} : defaultValue;
    }

    if(VarUtil.hasKey(this.params, key)) {
      return this.params[key];
    }

    if(key == null) {
      return this.params;
    }

    return defaultValue;
  }

  /**
   * Get all route parameters
   * @returns {Object} Route parameters object
   */
  getParams() {
    return this.params || {};
  }

  /**
   * Set dispatched flag
   * @param {boolean} flag - Dispatched flag
   * @returns {Request} For method chaining
   */
  setDispatched(flag = true) {
    this.dispatched = flag ? true : false;

    return this;
  }

  /**
   * Check if request is dispatched
   * @returns {boolean} True if dispatched
   */
  isDispatched() {
    return this.dispatched;
  }

  /**
   * Check if request method is GET
   * @returns {boolean} True if GET request
   */
  isGet() {
    return (this.HTTP_METHODS.indexOf(this.method) !== -1 &&
      this.method === this.METHOD_GET);
  }

  /**
   * Check if request method is POST
   * @returns {boolean} True if POST request
   */
  isPost() {
    return (this.HTTP_METHODS.indexOf(this.method) !== -1 &&
      this.method === this.METHOD_POST);
  }

  /**
   * Check if request method is PUT
   * @returns {boolean} True if PUT request
   */
  isPut() {
    return (this.HTTP_METHODS.indexOf(this.method) !== -1 &&
      this.method === this.METHOD_PUT);
  }

  /**
   * Check if request method is DELETE
   * @returns {boolean} True if DELETE request
   */
  isDelete() {
    return (this.HTTP_METHODS.indexOf(this.method) !== -1 &&
      this.method === this.METHOD_DELETE);
  }

  /**
   * Check if request method is PATCH
   * @returns {boolean} True if PATCH request
   */
  isPatch() {
    return (this.HTTP_METHODS.indexOf(this.method) !== -1 &&
      this.method === this.METHOD_PATCH);
  }

  /**
   * Set route name
   * @param {string} routeName - Route name
   * @returns {Request} For method chaining
   */
  setRouteName(routeName) {
    this.routeName = routeName;
    return this;
  }

  /**
   * Get route name
   * @returns {string|null} Route name
   */
  getRouteName() {
    return this.routeName;
  }

  /**
   * Set session object
   * @param {Object} session - Express session object
   * @returns {Request} For method chaining
   */
  setSession(session) {
    this.session = session;
    return this;
  }

  /**
   * Get session object
   * @returns {Object|null} Express session object
   */
  getSession() {
    return this.session;
  }

  /**
   * Required by Readable. We operate in push-mode: chunks are forwarded
   * from the Express IncomingMessage via listeners set in setExpressRequest().
   */
  _read() {}

  /**
   * Set raw Express request object and wire it as the stream source.
   * Chunks emitted by the Express IncomingMessage are forwarded into this
   * Readable so callers can pipe()/pipeline() the wrapper directly.
   * getExpressRequest() continues to work for legacy code.
   * @param {Object} req - Express request object (Node.js IncomingMessage)
   * @returns {Request} For method chaining
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

  /**
   * Get raw Express request object (legacy access).
   * @returns {Object|null} Express request object
   */
  getExpressRequest() {
    return this.expressRequest;
  }

}

module.exports = Request;