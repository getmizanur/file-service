const BaseController = require('../mvc/controller/base-controller');
const ClassUtil = require('../util/class-util');
const StringUtil = require('../util/string-util');
const Registry = require('./registry');
const Session = require('../session/session');
const Request = require('../http/request');
const Response = require('../http/response');
const fs = require('fs');
const path = require('path');


class Bootstrapper {

  constructor() {
    this.resources = null;
    this.frontController = null;
    this.delimiter = "_";
    this.classResource = {};
    this.serviceManager = null;
    this.container = null;
  }

  getContainer() {
    if(this.container == null) {
      return new Registry();
    }

    return this.container;
  }

  setContainer(registry) {
    if(!(registry instanceof Registry)) {
      throw Error('Resource containers must be Registry object');
    }

    this.container = registry;

    return this;
  }

  getResources() {
    return this.getClassResources(this)
      .filter((item) => item.match(/^init/g));
  }

  getClassResources(obj) {
    this.classResource = obj;

    return ClassUtil.getClassMethods(obj)
  }

  _executeResources(resource) {
    let className = this.classResource || this;
    if(typeof className[resource] === 'function') {
      className[resource]();
    }
  }

  /**
   * Resolve error template path with layered fallback approach
   * @param {string} errorType - '404' or '500'
   * @returns {string} Resolved template path
   * @throws {Error} If template file doesn't exist
   */
  resolveErrorTemplate(errorType) {
    let templatePath = null;
    let templateKey = null;

    try {
      // Layer 1: Get template key from configuration
      const config = this.getContainer().get('application');
      const viewManager = config?.view_manager;

      if(errorType === '404') {
        templateKey = viewManager?.not_found_template || 'error/404';
      } else if(errorType === '500') {
        templateKey = viewManager?.exception_template || 'error/500';
      } else {
        templateKey = `error/${errorType}`;
      }

      // Layer 2: Check template map configuration using the template key
      const templateMap = viewManager?.template_map;
      if(templateMap && templateMap[templateKey]) {
        templatePath = templateMap[templateKey];
      }
    } catch (error) {
      // Config not available, continue to fallback
    }

    // Layer 3: Fallback to default location if not in template map
    if(!templatePath) {
      templatePath = global.applicationPath(`/view/error/${errorType}.njk`);
      templateKey = `error/${errorType}`;
    }

    // Layer 4: File existence check + helpful error handling
    if(!fs.existsSync(templatePath)) {
      const expectedPath = global.applicationPath(`/view/error/${errorType}.njk`);
      throw new Error(`
Error ${errorType} template not found: ${templatePath}

To fix this issue:
1. Create the ${errorType} error template file:
   ${expectedPath}

2. OR configure a custom template path in application.config.js:
   "view_manager": {
       "template_map": {
           "${templateKey}": "path/to/your/${errorType}.njk"
       }
   }

3. OR use environment variables:
   VIEW_NOT_FOUND_TEMPLATE="${templateKey}" (for 404 errors)
   VIEW_EXCEPTION_TEMPLATE="${templateKey}" (for 500 errors)

The ${errorType}.njk template should extend your layout and provide user-friendly error messaging.
            `.trim());
    }

    return {
      templatePath,
      templateKey
    };
  }

  match(path) {
    let registry = this.getContainer();
    let router = registry.get('routes');
    let returnValue = null;
    for(let key in router) {
      if(router[key].route == path) {
        returnValue = router[key];
        // Also include the route name (key) in the return value
        returnValue.routeName = key;
      }
    }

    return returnValue;
  }

  async dispatcher(req, res, next) {
    // Validate HTTP method early to return 405 for invalid methods (bot/scanner traffic)
    const validMethods = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
    const method = (req.method || '').toUpperCase();
    if (!validMethods.includes(method)) {
      return res.status(405).set('Allow', validMethods.join(', ')).send('Method Not Allowed');
    }

    let module, controller, action;

    // Handle 404 cases where req.route doesn't exist or custom 404 routing
    if(!req.route || !req.route.path) {
      // Check if this is our custom 404 handler
      if(req.module && req.controller && req.action) {
        module = req.module;
        controller = req.controller;
        action = req.action;
      } else {
        // Default 404 handling
        module = 'error';
        controller = 'index';
        action = 'notFound';
      }
    } else {
      const routeMatch = this.match(req.route.path);
      ({
        module,
        controller,
        action
      } = routeMatch);
      // Store the route name for later use
      req.routeName = routeMatch ? routeMatch.routeName : null;
    }

    module = (module != undefined) ? StringUtil.toCamelCase(module) : 'default';
    controller = StringUtil.toCamelCase(controller);
    action = StringUtil.toCamelCase(action);

    let delimiter = this.getDelimiter();
    let controllerPath = StringUtil.strReplace(delimiter, '/', controller);

    // Convert controller name from camelCase to kebab-case and append -controller
    // e.g., "index" -> "index-controller", "postEditor" -> "post-editor-controller"
    controllerPath = controllerPath
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '') + '-controller';

    const FrontController = require(global.applicationPath(`/application/module/${module}/controller/${controllerPath}`));

    console.log('[Bootstraper.dispatcher]:');
    console.log(this.getContainer());

    // Inject configuration
    let options = {
      "container": this.getContainer(),
      "serviceManager": this.serviceManager
    };
    const front = new FrontController(options);
    if(!(front instanceof BaseController)) {
      return res.status(400).json({
        success: false,
        message: 'Controller not found'
      }).send();
    }

    if(action == undefined) {
      action = 'index';
    }

    action = action + 'Action';
    if(front[action] == undefined) {
      // Call notFoundAction() like in Zend Framework
      action = 'notFoundAction';
      // Set a flag to indicate this should be 404
      req._is404 = true;
    }

    if(req.hasOwnProperty('session')) {
      Session.start(req);

      //Session.start(req);
    }

    console.log("===Bootstrapper===");
    console.log(controller);
    console.log(action);

    let request = new Request();
    request.setModuleName(module);
    request.setControllerName(controller);
    request.setActionName(action);
    request.setMethod(req.method);
    request.setDispatched(true);
    request.setHeaders(req.headers);
    request.setQuery(req.query || {});
    request.setRoutePath(req.route ? req.route.path : req.path);
    request.setPath(req.path);
    request.setUrl(req.url);
    // Set the route name if available
    if(req.routeName) {
      request.setRouteName(req.routeName);
    }

    // Set route parameters (from Express req.params)
    request.setParams(req.params || {});
    // Set POST data
    request.setPost(req.body);
    // Set express-session object
    request.setSession(req.session);
    // Set raw Express request object
    request.setExpressRequest(req);

    // front.setRequest(request);

    // Create RouteMatch instance and store in ServiceManager
    const RouteMatch = require(global.applicationPath('/library/mvc/router/route-match'));
    const routeMatchParams = {
      module: module,
      controller: controller,
      action: action,
      ...req.params // Include all route parameters (slug, id, etc.)
    };
    const routeMatch = new RouteMatch(routeMatchParams, req.routeName);

    let response = new Response();
    // front.setResponse(response);

    // Store RouteMatch, Request, and Response in Application service for access throughout the application
    const serviceManager = front.getServiceManager();
    if(serviceManager) {
      const app = serviceManager.get('Application');
      if(app) {
        console.log('[Dispatcher] Setting Request on Application service');
        app.setRouteMatch(routeMatch);
        app.setRequest(request);
        app.setResponse(response);
      }
    }

    let view;
    try {
      const dispatchResult = await front.dispatch();
      // Handle async dispatch results
      if(dispatchResult && typeof dispatchResult.then === 'function') {
        view = await dispatchResult;
      } else {
        view = dispatchResult;
      }
    } catch (error) {
      // Handle server errors with framework-level error handling
      console.error('Server error in dispatcher:', error);

      try {
        // Resolve 500 template path using framework-level error handling
        const {
          templatePath,
          templateKey
        } = this.resolveErrorTemplate('500');

        // Set 500 status and render template directly (no MVC overhead)
        res.status(500);
        return res.render(templatePath, {
          pageTitle: 'Server Error',
          errorCode: 500,
          errorMessage: 'Sorry, there was an internal server error. Please try again later.',
          errorDetails: process.env.NODE_ENV === 'development' ? error.stack : null
        });
      } catch (templateError) {
        // If error template resolution fails, send basic error response
        console.error('Error template resolution failed:', templateError.message);
        return res.status(500).send(`
                    <h1>500 - Internal Server Error</h1>
                    <p>Sorry, there was an internal server error. Please try again later.</p>
                    <hr>
                    <p><strong>Developer Note:</strong> ${templateError.message}</p>
                    ${process.env.NODE_ENV === 'development' ? `<pre>${error.stack}</pre>` : ''}
                `);
      }
    }

    // If Express has already sent the response (e.g. controller used 
    // res.json/res.redirect), then do NOT attempt to render or redirect again.
    if(res.headersSent) {
      return;
    }

    if(front.getResponse().isRedirect()) {
      let location = front.getResponse().getHeader('Location');
      return res.redirect(location);
    }

    // If controller explicitly disabled rendering, assume it has already written to 
    // res and just exit.
    /*if (typeof front.isNoRender === 'function' && front.isNoRender()) {
        return;
    }*/

    // Normal view rendering path
    if(view) {
      // Check for custom status code from view model or request flags
      let statusCode = null;
      if(view && typeof view.getVariable === 'function') {
        statusCode = view.getVariable('_status');
      } else {
        console.error('Bootstrapper: view is not a proper ViewModel instance:', typeof view, view);
      }
      statusCode = statusCode || (req._is404 ? 404 : null) || (req._is500 ? 500 : null);
      if(statusCode) {
        res.status(statusCode);
      }

      // BEFORE you render the view, prepare flash messages:
      front.prepareFlashMessenger();

      return res.render(view.getTemplate(), view.getVariables());
    }
  }

  getDelimiter() {
    return this.delimiter;
  }

  run() {
    const PORT = process.env.PORT || 8080
    const server = this.app.listen(
      PORT,
      "::",
      () => { 
	 console.log(
          `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      }
    );

    if(process.env.NODE_ENV === 'test.local') {
      server.close();
    }

    // Handle unhandled promise rejection
    process.on('unhandledRejection', (err, promise) => {
      console.log(`Error: ${err.message}`);

      // Close server & exit process
      server.close(() => process.exit(1));
    });
  }

}

module.exports = Bootstrapper;
