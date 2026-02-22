const StringUtil = require('../util/string-util');
const VarUtil = require('../util/var-util');

/**
 * Response - HTTP Response wrapper class
 *
 * Clean architecture:
 * - Acts as a framework-level response abstraction (ZF-style).
 * - Can optionally wrap an Express response (single source of truth for sending).
 * - Stores headers/status/body in the wrapper for controller/service usage.
 * - Bootstrapper can still flush it (backward compatible).
 */
class Response {

  constructor(expressResponse = null, options = {}) {
    this.expressResponse = null;

    this.headers = {};
    this.httpResponseCode = 200;
    this.redirected = false;

    // compatibility with your bootstrapper
    this.body = null;
    this.hasBody = false;

    // "headers were modified" flag (bootstrapper checks canSendHeaders())
    this.sendHeaders = false;

    // placeholder (kept because it existed)
    this.exceptions = {};

    if (expressResponse) {
      this.setExpressResponse(expressResponse);
    }
  }

  /**
   * Attach Express response object.
   * (Optional: if you prefer bootstrapper flushing, you can ignore this.)
   */
  setExpressResponse(res) {
    this.expressResponse = res;
    return this;
  }

  getExpressResponse() {
    return this.expressResponse;
  }

  /**
   * Normalize header name to proper format (Title-Case)
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
   * Mark that headers may be sent (or check whether we have set any)
   *
   * NOTE:
   * This is used by your bootstrapper as:
   *   frameworkResponse.canSendHeaders()
   * so we keep the semantics: "have we set headers/status/redirect?"
   */
  canSendHeaders(headersSent = false) {
    if (this.sendHeaders === false && headersSent === true) {
      this.sendHeaders = true;
    }
    return this.sendHeaders;
  }

  /**
   * Set HTTP header
   */
  setHeader(name, value, replace = true) {
    this.canSendHeaders(true);

    name = this._normalizeHeaders(name);

    if (replace) {
      Object.keys(this.headers).forEach((key) => {
        if (name === key) delete this.headers[key];
      });
      this.headers[name] = value;
      return this;
    }

    // allow multiple values
    if (!VarUtil.hasKey(this.headers, name)) {
      this.headers[name] = value;
      return this;
    }

    const existing = this.headers[name];
    if (Array.isArray(existing)) {
      existing.push(value);
      this.headers[name] = existing;
    } else {
      this.headers[name] = [existing, value];
    }

    return this;
  }

  /**
   * Alias for setHeader with replace=false
   */
  addHeader(name, value) {
    return this.setHeader(name, value, false);
  }

  /**
   * Get HTTP header
   */
  getHeader(name, defaultValue = null) {
    name = this._normalizeHeaders(name);
    if (VarUtil.hasKey(this.headers, name)) return this.headers[name];
    return defaultValue;
  }

  /**
   * Get all headers
   */
  getHeaders() {
    return this.headers;
  }

  clearHeaders() {
    this.headers = {};
    return this;
  }

  clearHeader(name) {
    name = this._normalizeHeaders(name);
    if (VarUtil.hasKey(this.headers, name)) delete this.headers[name];
    return this;
  }

  /**
   * Set HTTP response code
   */
  setHttpResponseCode(code) {
    if (!VarUtil.isInt(code) || (100 > code) || (599 < code)) {
      throw new Error('Invalid HTTP response code');
    }

    this.canSendHeaders(true);

    // treat 3xx as redirect-ish (your previous logic used 300..307)
    this.redirected = (300 <= code && code < 400);

    this.httpResponseCode = code;
    return this;
  }

  /**
   * Alias to match Express API style
   */
  status(code) {
    return this.setHttpResponseCode(code);
  }

  getHttpResponseCode() {
    return this.httpResponseCode;
  }

  /**
   * Set response body (string/buffer/object)
   *
   * Note:
   * - this does NOT automatically send to express.
   * - bootstrapper can flush it (existing behavior)
   */
  setBody(body) {
    this.body = body;
    this.hasBody = !(body === undefined || body === null || body === '');
    return this;
  }

  getBody(defaultValue = null) {
    if (this.body === undefined || this.body === null) return defaultValue;
    return this.body;
  }

  clearBody() {
    this.body = null;
    this.hasBody = false;
    return this;
  }

  /**
   * Convenience JSON response helper (doesn't send immediately)
   */
  json(payload, code = 200) {
    this.setHeader('Content-Type', 'application/json; charset=utf-8', true);
    this.setHttpResponseCode(code);

    // stringify now so bootstrapper res.send(body) works
    this.setBody(JSON.stringify(payload));
    return this;
  }

  /**
   * Set redirect response
   */
  setRedirect(url, code = 302) {
    this.canSendHeaders(true);
    this.setHeader('Location', url, true);
    this.setHttpResponseCode(code);

    // ensure flag is set even if code logic changes later
    this.redirected = true;

    return this;
  }

  isRedirect() {
    return this.redirected === true;
  }

  /**
   * Optional: flush this framework response into Express res.
   * You can use this instead of bootstrapper manually applying headers/body.
   */
  flushToExpress(res = null) {
    const expressRes = res || this.expressResponse;
    if (!expressRes) return false;

    // status
    if (this.httpResponseCode) {
      expressRes.status(this.httpResponseCode);
    }

    // headers
    const headers = this.getHeaders() || {};
    Object.keys(headers).forEach((k) => {
      try {
        expressRes.setHeader(k, headers[k]);
      } catch (e) {
        console.debug('Response.flushToExpress: failed to set header', k, e.message);
      }
    });

    // redirect
    if (this.isRedirect()) {
      const location = this.getHeader('Location');
      if (location) return expressRes.redirect(location);
      return true;
    }

    // body
    if (this.hasBody) {
      return expressRes.send(this.body);
    }

    return expressRes.end();
  }
}

module.exports = Response;