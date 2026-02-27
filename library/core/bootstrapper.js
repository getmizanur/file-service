// library/core/bootstrapper.js
const BaseController = require('../mvc/controller/base-controller');
const ClassUtil = require('../util/class-util');
const StringUtil = require('../util/string-util');
const Session = require('../session/session');
const Request = require('../http/request');
const Response = require('../http/response');
const fs = require('fs');

class Bootstrapper {
  constructor() {
    this.resources = null;
    this.frontController = null;
    this.delimiter = "_";
    this.classResource = {};

    this.serviceManager = null;
    this.routes = null;
  }

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
    } catch (e) {
      return sm.config || {};
    }
  }

  getResources() {
    return this.getClassResources(this)
      .filter((item) => item.match(/^init/g));
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
      if (templateMap && templateMap[templateKey]) {
        templatePath = templateMap[templateKey];
      }
    } catch (error) {}

    if (!templatePath) {
      templatePath = global.applicationPath(`/view/error/${errorType}.njk`);
      templateKey = `error/${errorType}`;
    }

    if (!fs.existsSync(templatePath)) {
      const expectedPath = global.applicationPath(`/view/error/${errorType}.njk`);
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

  async dispatcher(req, res, next) {
    const validMethods = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
    const method = (req.method || '').toUpperCase();
    if (!validMethods.includes(method)) {
      return res.status(405).set('Allow', validMethods.join(', ')).send('Method Not Allowed');
    }

    let module, controller, action;

    if (!req.route || !req.route.path) {
      if (req.module && req.controller && req.action) {
        module = req.module;
        controller = req.controller;
        action = req.action;
      } else {
        module = 'error';
        controller = 'index';
        action = 'notFound';
      }
    } else {
      const routeMatch = this.match(req.route.path);
      ({ module, controller, action } = routeMatch || {});
      req.routeName = routeMatch ? routeMatch.routeName : null;
    }

    module = (module != undefined) ? StringUtil.toCamelCase(module) : 'default';
    controller = StringUtil.toCamelCase(controller);
    action = StringUtil.toCamelCase(action);

    const delimiter = this.getDelimiter();
    let controllerPath = StringUtil.strReplace(delimiter, '/', controller);

    controllerPath = controllerPath
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '') + '-controller';

    const FrontController = require(
      global.applicationPath(`/application/module/${module}/controller/${controllerPath}`)
    );

    // Create a per-request container (ZF2-style request scope)
    const rootSm = this.serviceManager;
    const requestSm = (rootSm && typeof rootSm.createRequestScope === 'function')
      ? rootSm.createRequestScope({ scopedSingletonServices: ['MvcEvent'] })
      : rootSm;

    const options = { serviceManager: requestSm };
    const front = new FrontController(options);

    if (!(front instanceof BaseController)) {
      return res.status(400).json({ success: false, message: 'Controller not found' }).send();
    }

    if (action == undefined) action = 'index';
    action = action + 'Action';

    if (front[action] == undefined) {
      action = 'notFoundAction';
      req._is404 = true;
    }

    if (req.hasOwnProperty('session')) {
      Session.start(req);
    }

    const request = new Request(req);

    const RouteMatch = require(global.applicationPath('/library/mvc/router/route-match'));
    const routeMatchParams = { module, controller, action, ...req.params };
    const routeMatch = new RouteMatch(routeMatchParams, req.routeName);

    const response = new Response();

    // ZF2-style per-request event context
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

    // Trigger lifecycle events (minimal ZF2-like pipeline)
    const em = sm && typeof sm.get === 'function' ? sm.get('EventManager') : null;
    if (em && event) {
      em.trigger('route', event);
      em.trigger('dispatch.pre', event);
    }

    let view;
    try {
      const dispatchResult = await front.dispatch();
      view = (dispatchResult && typeof dispatchResult.then === 'function')
        ? await dispatchResult
        : dispatchResult;

      if (em && event) {
        event.setResult(view);
        em.trigger('dispatch.post', event);
      }
    } catch (error) {
      console.error('Server error in dispatcher:', error);

      try {
        if (event && typeof event.setError === 'function') event.setError(error);
        if (event && typeof event.setException === 'function') event.setException(error);
        if (em && event) em.trigger('error', event);
      } catch (_) {}

      try {
        const { templatePath } = this.resolveErrorTemplate('500');
        res.status(500);
        return res.render(templatePath, {
          pageTitle: 'Server Error',
          errorCode: 500,
          errorMessage: 'Sorry, there was an internal server error. Please try again later.',
          errorDetails: process.env.NODE_ENV === 'development' ? error.stack : null
        });
      } catch (templateError) {
        return res.status(500).send('500 - Internal Server Error');
      }
    }

    if (res.headersSent) return;

    // Use the per-request response (not the singleton) to avoid race conditions.
    const frameworkResponse = response;
    const controllerNoRender = (typeof front.isNoRender === 'function' && front.isNoRender());
    const responseHasBody = !!frameworkResponse?.hasBody;
    const responseHasHeaders = !!frameworkResponse?.canSendHeaders?.();

    if (controllerNoRender || responseHasBody || responseHasHeaders) {
      if (frameworkResponse && typeof frameworkResponse.getHeaders === 'function') {
        const headers = frameworkResponse.getHeaders();
        for (const key of Object.keys(headers || {})) {
          try { res.setHeader(key, headers[key]); } catch (e) {}
        }
      }

      if (frameworkResponse && typeof frameworkResponse.getHttpResponseCode === 'function') {
        res.status(frameworkResponse.getHttpResponseCode());
      }

      if (frameworkResponse && typeof frameworkResponse.isRedirect === 'function' && frameworkResponse.isRedirect()) {
        const location = frameworkResponse.getHeader('Location');
        return res.redirect(location);
      }

      if (frameworkResponse && frameworkResponse.hasBody) {
        const body = frameworkResponse.body;
        if (body === undefined || body === null || body === '') return res.end();
        return res.send(body);
      }

      return res.end();
    }

    if (response.isRedirect()) {
      const location = response.getHeader('Location');
      return res.redirect(location);
    }

    if (view) {
      let statusCode = null;
      if (view && typeof view.getVariable === 'function') {
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