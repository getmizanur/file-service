const StringUtil = require('../util/string-util');
const VarUtil = require('../util/var-util');

/**
 * Response - HTTP Response wrapper class
 * Encapsulates HTTP response data including headers, status codes, and redirects
 */
class Response {

  constructor(options = {}) {
    this.headers = {};
    this.httpResponseCode = 200;
    this.redirected = false;
    this.exceptions = {};
    this.sendHeaders = false;
  }

  /**
   * Normalize header name to proper format
   * @param {string} name - Header name
   * @returns {string} Normalized header name
   */
  _normalizeHeaders(name) {
    if (!VarUtil.isString(name)) {
      throw new Error('Header name must be a string');
    }

    let filtered = StringUtil.strReplace('/-/_/gi', ' ', name);
    filtered = StringUtil.ucwords(StringUtil.strtolower(filtered));
    filtered = StringUtil.strReplace(' ', '-', filtered);

    return filtered;
  }

  /**
   * Set HTTP header
   * @param {string} name - Header name
   * @param {string} value - Header value
   * @param {boolean} replace - Replace existing header
   * @returns {Response} For method chaining
   */
  setHeader(name, value, replace = true) {
    this.canSendHeaders(true);

    name = this._normalizeHeaders(name);

    if (replace) {
      Object.keys(this.headers).forEach((key) => {
        if (name === key) {
          delete this.headers[key];
        }
      });
    }

    this.headers[name] = value;

    return this;
  }

  /**
   * Get HTTP header
   * @param {string} name - Header name
   * @param {*} defaultValue - Default value if header doesn't exist
   * @returns {*} Header value or default
   */
  getHeader(name, defaultValue = null) {
    name = this._normalizeHeaders(name);

    if (VarUtil.hasKey(this.headers, name)) {
      return this.headers[name];
    }

    return defaultValue;
  }

  /**
   * Set redirect response
   * @param {string} url - Redirect URL
   * @param {number} code - HTTP redirect code (default: 302)
   * @returns {Response} For method chaining
   */
  setRedirect(url, code = 302) {
    this.canSendHeaders(true);
    this.setHeader('Location', url, true)
      .setHttpResponseCode(code);

    return this;
  }

  /**
   * Check if response is a redirect
   * @returns {boolean} True if redirect
   */
  isRedirect() {
    return this.redirected;
  }

  /**
   * Get all HTTP headers
   * @returns {Object} Headers object
   */
  getHeaders() {
    return this.headers;
  }

  /**
   * Clear all HTTP headers
   * @returns {Response} For method chaining
   */
  clearHeaders() {
    this.headers = {};

    return this;
  }

  /**
   * Clear specific HTTP header
   * @param {string} name - Header name to clear
   * @returns {Response} For method chaining
   */
  clearHeader(name) {
    name = this._normalizeHeaders(name);

    if (VarUtil.hasKey(this.headers, name)) {
      delete this.headers[name];
    }

    return this;
  }

  /**
   * Set HTTP response code
   * @param {number} code - HTTP response code (100-599)
   * @returns {Response} For method chaining
   */
  setHttpResponseCode(code) {
    if (!VarUtil.isInt(code) || (100 > code) || (599 < code)) {
      throw new Error('Invalid HTTP response code');
    }

    if ((300 <= code) && (307 >= code)) {
      this.redirected = true;
    } else {
      this.redirected = false;
    }

    this.httpResponseCode = code;

    return this;
  }

  /**
   * Alias for setHttpResponseCode to match Express API
   * @param {number} code
   * @returns {Response}
   */
  status(code) {
    return this.setHttpResponseCode(code);
  }

  /**
   * Get HTTP response code
   * @returns {number} HTTP response code
   */
  getHttpResponseCode() {
    return this.httpResponseCode;
  }

  /**
   * Check if headers can be sent or mark them as sent
   * @param {boolean} headersSent - Mark headers as sent
   * @returns {boolean} True if headers already sent
   */
  canSendHeaders(headersSent = false) {
    if (this.sendHeaders === false && headersSent === true) {
      this.sendHeaders = headersSent;
    }

    return this.sendHeaders;
  }

}

module.exports = Response;