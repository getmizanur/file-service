// library/core/bootstrapper.js
const BaseController = require('../mvc/controller/base-controller');
const ClassUtil = require('../util/class-util');
const StringUtil = require('../util/string-util');
const Session = require('../session/session');
const Request = require('../http/request');
const Response = require('../http/response');
const fs = require('node:fs');

class Bootstrapper {
  resources = null;
  frontController = null;
  delimiter = "_";
  classResource = {};
  serviceManager = null;
  routes = null;

  setServiceManager(serviceManager) {
    this.serviceManager = serviceManager;
    return this;
  }

  getServiceManager() {
    return this.serviceManager;
  }

  setRoutes(routes) {
    this.routes = routes;
    return this;
  }

  getRoutes() {
    if (this.routes) return this.routes;

    const cfg = this.getConfig();
    if (cfg?.router?.routes) {
      this.routes = cfg.router.routes;
      return this.routes;
    }
    return null;
  }

  getConfig() {
    const sm = this.getServiceManager();
    if (!sm) return {};

    try {
      return sm.get('Config');
    } catch {
      // Intentionally ignored - Config service not registered yet; fall back to raw config property
      return sm.config || {};
    }
  }

  getResources() {
    return this.getClassResources(this)
      .filter((item) => item.startsWith('init'));
  }

  getClassResources(obj) {
    this.classResource = obj;
    return ClassUtil.getClassMethods(obj);
  }

  _executeResources(resource) {
    let className = this.classResource || this;
    if (typeof className[resource] === 'function') {
      className[resource]();
    }
  }

  resolveErrorTemplate(errorType) {
    let templatePath = null;
    let templateKey = null;

    try {
      const config = this.getConfig();
      const viewManager = config?.view_manager;

      if (errorType === '404') {
        templateKey = viewManager?.not_found_template || 'error/404';
      } else if (errorType === '500') {
        templateKey = viewManager?.exception_template || 'error/500';
      } else {
        templateKey = `error/${errorType}`;
      }

      const templateMap = viewManager?.template_map;
      if (templateMap?.[templateKey]) {
        templatePath = templateMap[templateKey];
      }
    } catch {
      // Intentionally ignored - view manager may not be initialized; fall back to default template path
    }

    if (!templatePath) {
      templatePath = globalThis.applicationPath(`/view/error/${errorType}.njk`);
      templateKey = `error/${errorType}`;
    }

    if (!fs.existsSync(templatePath)) {
      const expectedPath = globalThis.applicationPath(`/view/error/${errorType}.njk`);
      throw new Error(`Error ${errorType} template not found: ${templatePath}\nExpected: ${expectedPath}`);
    }

    return { templatePath, templateKey };
  }

  match(path) {
    const router = this.getRoutes();
    if (!router) return null;

    let returnValue = null;
    for (let key in router) {
      if (router[key].route == path) {
        returnValue = router[key];
        returnValue.routeName = key;
      }
    }
    return returnValue;
  }

  /**
   * Resolve module, controller, and action from the request.
   */
  _resolveRouteInfo(req) {
    let module, controller, action;

    if (req.route?.path) {
      const routeMatch = this.match(req.route.path);
      ({ module, controller, action } = routeMatch || {});
      req.routeName = routeMatch ? routeMatch.routeName : null;
    } else if (req.module && req.controller && req.action) {
      module = req.module;
      controller = req.controller;
      action = req.action;
    } else {
      module = 'error';
      controller = 'index';
      action = 'notFound';
    }

    module = (module == undefined) ? 'default' : StringUtil.toCamelCase(module);
    controller = StringUtil.toCamelCase(controller);
    action = StringUtil.toCamelCase(action);

    return { module, controller, action };
  }

  /**
   * Load the controller class, create an instance, and validate it.
   * Returns { front, requestSm } or null if invalid.
   */
  _buildController(module, controller, res) {
    const delimiter = this.getDelimiter();
    let controllerPath = StringUtil.strReplace(delimiter, '/', controller);

    controllerPath = controllerPath
      .replaceAll(/([A-Z])/, '-$1')
      .toLowerCase()
      .replace(/^-/, '') + '-controller';

    const FrontController = require(
      globalThis.applicationPath(`/application/module/${module}/controller/${controllerPath}`)
    );

    // Create a per-request container (request scope)
    const rootSm = this.serviceManager;
    const requestSm = (rootSm && typeof rootSm.createRequestScope === 'function')
      ? rootSm.createRequestScope({ scopedSingletonServices: ['MvcEvent'] })
      : rootSm;

    const options = { serviceManager: requestSm };
    const front = new FrontController(options);

    if (!(front instanceof BaseController)) {
      res.status(400).json({ success: false, message: 'Controller not found' }).send();
      return null;
    }

    return { front, requestSm };
  }

  /**
   * Create Request, RouteMatch, Response, set up MvcEvent and trigger pre-dispatch events.
   * Returns { request, routeMatch, response, event, em, sm }.
   */
  _setupRequestContext(req, front, module, controller, action, requestSm) {
    const request = new Request(req);

    const RouteMatch = require(globalThis.applicationPath('/library/mvc/router/route-match'));
    const routeMatchParams = { module, controller, action, ...req.params };
    const routeMatch = new RouteMatch(routeMatchParams, req.routeName);

    const response = new Response();

    // Per-request event context
    const sm = front.getServiceManager ? front.getServiceManager() : requestSm;
    const event = sm && typeof sm.get === 'function' ? sm.get('MvcEvent') : null;
    if (event) {
      event.setRequest(request);
      event.setResponse(response);
      event.setRouteMatch(routeMatch);
      event.setDispatched(true);
    }

    // Inject event into controller (preferred access path)
    if (event && typeof front.setEvent === 'function') {
      front.setEvent(event);
    }

    // Trigger lifecycle events
    const em = sm && typeof sm.get === 'function' ? sm.get('EventManager') : null;
    if (em && event) {
      em.trigger('route', event);
      em.trigger('dispatch.pre', event);
    }

    return { request, routeMatch, response, event, em, sm };
  }

  /**
   * Execute the dispatch on the controller and handle dispatch errors.
   * Returns the view on success, or a sentinel { handled: true } if an error response was sent.
   */
  async _executeDispatch(res, front, em, event) {
    try {
      const dispatchResult = await front.dispatch();
      const view = (dispatchResult && typeof dispatchResult.then === 'function')
        ? await dispatchResult
        : dispatchResult;

      if (em && event) {
        event.setResult(view);
        em.trigger('dispatch.post', event);
      }
      return { view, handled: false };
    } catch (error) {
      this._handleDispatchError(res, error, em, event);
      return { view: null, handled: true };
    }
  }

  _handleDispatchError(res, error, em, event) {
    console.error('Server error in dispatcher:', error);
    this._triggerErrorEvents(em, event, error);
    this._sendErrorResponse(res, error);
  }

  _triggerErrorEvents(em, event, error) {
    try {
      if (event && typeof event.setError === 'function') event.setError(error);
      if (event && typeof event.setException === 'function') event.setException(error);
      if (em && event) em.trigger('error', event);
    } catch {
      // Intentionally ignored - error event propagation is best-effort; must not mask the original error
    }
  }

  _sendErrorResponse(res, error) {
    try {
      const { templatePath } = this.resolveErrorTemplate('500');
      res.status(500);
      res.render(templatePath, {
        pageTitle: 'Server Error',
        errorCode: 500,
        errorMessage: 'Sorry, there was an internal server error. Please try again later.',
        errorDetails: process.env.NODE_ENV === 'development' ? error.stack : null
      });
    } catch {
      // Intentionally ignored - error template rendering failed; send plain text fallback
      res.status(500).send('500 - Internal Server Error');
    }
  }

  /**
   * Handle the framework response when noRender / hasBody / hasHeaders applies.
   * Returns true if a response was sent, false otherwise.
   */
  _handleFrameworkResponse(res, frameworkResponse, front) {
    const controllerNoRender = (typeof front.isNoRender === 'function' && front.isNoRender());
    const responseHasBody = !!frameworkResponse?.hasBody;
    const responseHasHeaders = !!frameworkResponse?.canSendHeaders?.();

    if (!controllerNoRender && !responseHasBody && !responseHasHeaders) {
      return false;
    }

    if (!frameworkResponse) {
      res.end();
      return true;
    }

    this._applyResponseHeaders(res, frameworkResponse);
    this._applyResponseStatus(res, frameworkResponse);

    if (typeof frameworkResponse.isRedirect === 'function' && frameworkResponse.isRedirect()) {
      res.redirect(frameworkResponse.getHeader('Location'));
      return true;
    }

    this._sendResponseBody(res, frameworkResponse);
    return true;
  }

  _applyResponseHeaders(res, frameworkResponse) {
    if (typeof frameworkResponse.getHeaders !== 'function') return;
    const headers = frameworkResponse.getHeaders();
    for (const key of Object.keys(headers || {})) {
      try { res.setHeader(key, headers[key]); } catch { /* Intentionally ignored - invalid header value should not break response */ }
    }
  }

  _applyResponseStatus(res, frameworkResponse) {
    if (typeof frameworkResponse.getHttpResponseCode === 'function') {
      res.status(frameworkResponse.getHttpResponseCode());
    }
  }

  _sendResponseBody(res, frameworkResponse) {
    if (frameworkResponse.hasBody) {
      const body = frameworkResponse.body;
      if (body === undefined || body === null || body === '') {
        res.end();
      } else {
        res.send(body);
      }
    } else {
      res.end();
    }
  }

  /**
   * Handle the view rendering case.
   */
  _renderView(res, view, front, req, em, event) {
    let statusCode = null;
    if (typeof view.getVariable === 'function') {
      statusCode = view.getVariable('_status');
    }

    statusCode = statusCode || (req._is404 ? 404 : null) || (req._is500 ? 500 : null);
    if (statusCode) res.status(statusCode);

    front.prepareFlashMessenger();
    // Prevent browser caching of dynamic pages — each navigation must fetch fresh content
    if (!res.getHeader('Cache-Control')) {
      res.setHeader('Cache-Control', 'private, no-store');
    }
    if (em && event) {
      em.trigger('render', event);
    }
    const renderResult = res.render(view.getTemplate(), view.getVariables());
    if (em && event) {
      em.trigger('finish', event);
    }
    return renderResult;
  }

  async dispatcher(req, res, next) {
    const validMethods = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
    const method = (req.method || '').toUpperCase();
    if (!validMethods.includes(method)) {
      return res.status(405).set('Allow', validMethods.join(', ')).send('Method Not Allowed');
    }

    let { module, controller, action } = this._resolveRouteInfo(req);

    const built = this._buildController(module, controller, res);
    if (!built) return;
    const { front, requestSm } = built;

    if (action == undefined) action = 'index';
    action = action + 'Action';

    if (front[action] == undefined) {
      action = 'notFoundAction';
      req._is404 = true;
    }

    if (Object.hasOwn(req, 'session')) {
      Session.start(req);
    }

    const { response, event, em } = this._setupRequestContext(req, front, module, controller, action, requestSm);

    const { view, handled } = await this._executeDispatch(res, front, em, event);
    if (handled) return;

    if (res.headersSent) return;

    if (this._handleFrameworkResponse(res, response, front)) return;

    if (view) {
      return this._renderView(res, view, front, req, em, event);
    }
  }

  getDelimiter() {
    return this.delimiter;
  }

  run() {
    const PORT = process.env.PORT || 8080;
    const server = this.app.listen(PORT, "::", () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });

    if (process.env.NODE_ENV === 'test.local') server.close();

    process.on('unhandledRejection', (err) => {
      console.log(`Error: ${err.message}`);
      server.close(() => process.exit(1));
    });
  }
}

module.exports = Bootstrapper;