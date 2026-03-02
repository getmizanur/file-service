// library/mvc/controller/rest-controller.js
const BaseController = require('./base-controller');

/**
 * RestController
 * ZF1-inspired REST controller base.
 *
 * Usage:
 * - Add a route whose action is "rest" so the dispatcher calls restAction().
 * - Extend this class and implement any of:
 *   indexAction/getAction/postAction/putAction/patchAction/deleteAction/optionsAction.
 *
 * Method mapping:
 * - GET    /resource        -> indexAction()
 * - GET    /resource/:id    -> getAction()
 * - POST   /resource        -> postAction()
 * - PUT    /resource/:id    -> putAction()
 * - PATCH  /resource/:id    -> patchAction()
 * - DELETE /resource/:id    -> deleteAction()
 * - OPTIONS                 -> optionsAction()
 */
class RestController extends BaseController {

  constructor(options = {}) {
    super(options);
    // REST controllers should not attempt template rendering.
    this.setNoRender(true);
  }

  /**
   * Main REST entrypoint.
   * Configure your route action as "rest" so this method is called.
   */
  async restAction() {
    const req = this.getRequest();
    const method = (req && typeof req.getMethod === 'function') ? req.getMethod() : 'GET';
    const upper = String(method || 'GET').toUpperCase();

    const id = this.getResourceId();

    // OPTIONS handler (CORS / discovery)
    if (upper === 'OPTIONS') {
      if (typeof this.optionsAction === 'function') {
        return await this.optionsAction();
      }
      return this.options();
    }

    let handlerName = null;
    switch (upper) {
      case 'GET':
      case 'HEAD':
        handlerName = id ? 'getAction' : 'indexAction';
        break;
      case 'POST':
        handlerName = 'postAction';
        break;
      case 'PUT':
        handlerName = 'putAction';
        break;
      case 'PATCH':
        handlerName = 'patchAction';
        break;
      case 'DELETE':
        handlerName = 'deleteAction';
        break;
      default:
        handlerName = null;
        break;
    }

    if (!handlerName || typeof this[handlerName] !== 'function') {
      return this.methodNotAllowed(upper);
    }

    try {
      const result = await this[handlerName]();

      // If handler returned a value and nothing has been written, default to JSON 200.
      const response = this.getResponse();
      const hasBody = !!response?.hasBody;

      if (result !== undefined && !hasBody) {
        return this.ok(result);
      }

      return result;
    } catch (err) {
      return this.handleException(err);
    }
  }

  /**
   * Override if your ID parameter is not named "id".
   */
  getResourceId() {
    return this.getParam('id', null);
  }

  // ---- Response helpers (canonical API surface) ----

  /**
   * Send payload with status+headers.
   * - Objects/arrays are JSON stringified
   * - Strings/Buffers are sent as-is
   * - Default Content-Type is application/json for non-string payloads
   */
  send(payload, { status = 200, headers = {}, contentType = null } = {}) {
    this.setNoRender(true);
    this.setStatus(status);

    const res = this.getResponse();

    // Apply headers first
    for (const [k, v] of Object.entries(headers || {})) {
      this.setHeader(k, v);
    }

    // Determine how to write payload
    const isBuffer = (typeof Buffer !== 'undefined') && Buffer.isBuffer(payload);
    const isString = (typeof payload === 'string');
    const isNullish = (payload === undefined || payload === null);

    // Choose/ensure Content-Type
    const existing = (typeof res.getHeader === 'function') ? res.getHeader('Content-Type') : null;

    if (contentType) {
      this.setHeader('Content-Type', contentType, true);
    } else if (!existing && !isString && !isBuffer && !isNullish) {
      this.setHeader('Content-Type', 'application/json; charset=utf-8', true);
    }

    // HEAD must not return a body but should keep status and headers
    const req = this.getRequest();
    const method = (req && typeof req.getMethod === 'function') ? String(req.getMethod()).toUpperCase() : 'GET';
    if (method === 'HEAD') {
      if (res && typeof res.clearBody === 'function') {
        res.clearBody();
      } else if (res) {
        res.body = null;
        res.hasBody = false;
      }
      return this;
    }

    if (isNullish) {
      // No payload => treat as empty body
      return this.setBody('');
    }

    if (isString || isBuffer) {
      return this.setBody(payload);
    }

    return this.setBody(JSON.stringify(payload));
  }

  ok(payload, headers = {}) {
    return this.send(payload, { status: 200, headers });
  }

  created(payload, location = null, headers = {}) {
    const merged = { ...(headers || {}) };
    if (location) merged.Location = location;
    return this.send(payload, { status: 201, headers: merged });
  }

  /**
   * 204 response with no body.
   * Ensures bootstrapper flushes headers/status without writing a body.
   */
  noContent(headers = {}) {
    this.setNoRender(true);
    this.setStatus(204);

    for (const [k, v] of Object.entries(headers || {})) {
      this.setHeader(k, v);
    }

    // Make sure bootstrapper knows we’ve handled response metadata
    const res = this.getResponse();
    if (res && typeof res.canSendHeaders === 'function') {
      res.canSendHeaders(true);
    }

    // Do not set body for 204
    if (res && typeof res.clearBody === 'function') {
      res.clearBody();
    } else if (res) {
      res.body = null;
      res.hasBody = false;
    }

    return this;
  }

  badRequest(message = 'Bad Request', details = null) {
    const payload = details ? { error: message, details } : { error: message };
    return this.send(payload, { status: 400 });
  }

  unauthorized(message = 'Unauthorized') {
    return this.send({ error: message }, { status: 401 });
  }

  forbidden(message = 'Forbidden') {
    return this.send({ error: message }, { status: 403 });
  }

  notFound(message = 'Not Found') {
    return this.send({ error: message }, { status: 404 });
  }

  conflict(message = 'Conflict') {
    return this.send({ error: message }, { status: 409 });
  }

  methodNotAllowed(method) {
    const allow = this.getAllowedMethods();
    return this.send(
      { error: `Method ${method} Not Allowed` },
      { status: 405, headers: { Allow: allow.join(', ') } }
    );
  }

  options(headers = {}) {
    const allow = this.getAllowedMethods();
    const merged = { Allow: allow.join(', '), ...(headers || {}) };
    return this.noContent(merged);
  }

  /**
   * Determine allowed methods from which handlers are implemented.
   * Override if you want to lock it down.
   */
  getAllowedMethods() {
    const methods = ['OPTIONS'];

    if (typeof this.indexAction === 'function' || typeof this.getAction === 'function') {
      methods.push('GET', 'HEAD');
    }
    if (typeof this.postAction === 'function') methods.push('POST');
    if (typeof this.putAction === 'function') methods.push('PUT');
    if (typeof this.patchAction === 'function') methods.push('PATCH');
    if (typeof this.deleteAction === 'function') methods.push('DELETE');

    return methods;
  }

  /**
   * Default exception handling for REST.
   * If you throw an Error with `statusCode` (or `status`), we'll respect it.
   */
  handleException(err) {
    const status = err?.statusCode || err?.status || 500;
    const message = err?.message || 'Internal Server Error';
    const payload = { error: message };

    if (process.env.NODE_ENV === 'development' && err?.stack) {
      payload.stack = err.stack;
    }

    return this.send(payload, { status });
  }

  /**
   * Get authenticated user identity
   */
  getUser() {
    try {
      const authService = this.getServiceManager().get('AuthenticationService');
      if (authService && authService.hasIdentity()) {
        return authService.getIdentity();
      }
    } catch (e) {
      console.debug('RestController.getUser: could not retrieve identity:', e.message);
    }
    return null;
  }
}

module.exports = RestController;