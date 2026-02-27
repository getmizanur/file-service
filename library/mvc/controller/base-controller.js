// library/mvc/controller/base-controller.js
const StringUtil = require('../../util/string-util');
const ViewModel = require('../view/view-model');

/**
 * BaseController - Abstract base class for all MVC controllers
 * ZF-inspired. Works for both view and REST controllers.
 */
class BaseController {

  constructor(options = {}) {
    this.container = options.container || null;
    this.serviceManager = options.serviceManager || null;

    // Avoid assuming ServiceManager has setController()
    if (this.serviceManager && typeof this.serviceManager.setController === 'function') {
      this.serviceManager.setController(this);
    }

    this.method = null;

    // ZF2-style per-request event context
    this.event = null;

    this.moduleName = null;
    this.controllerName = null;
    this.actionName = null;

    this.model = null;

    this.delimiter = null;

    this.pluginManager = null;
    this.viewManager = null;
    this.viewHelperManager = null;

    this.returnResponse = null;
    this.dispatched = false;
    this.view = null;

    this.noRender = false;
  }

  /**
   * Service Manager
   */
  setServiceManager(serviceManager) {
    this.serviceManager = serviceManager;

    // Guard (older SM versions may not have setController)
    if (this.serviceManager && typeof this.serviceManager.setController === 'function') {
      this.serviceManager.setController(this);
    }

    return this;
  }

  getServiceManager() {
    if (!this.serviceManager) {
      throw new Error('ServiceManager not injected into Controller');
    }
    return this.serviceManager;
  }

  /**
   * Config
   */
  getConfig() {
    return this.getServiceManager().get('Config');
  }


  /**
   * MvcEvent (ZF2-style)
   */
  setEvent(event) {
    this.event = event;
    return this;
  }

  getEvent() {
    return this.event;
  }

  /**
   * Request/Response (source of truth is Application service)
   */
  getRequest() {
    if (this.event && typeof this.event.getRequest === 'function' && this.event.getRequest()) {
      return this.event.getRequest();
    }
    // Backward compatibility (deprecated): Application held request state
    return this.getServiceManager().get('Application').getRequest();
  }

  getResponse() {
    if (this.event && typeof this.event.getResponse === 'function' && this.event.getResponse()) {
      return this.event.getResponse();
    }
    // Backward compatibility (deprecated): Application held response state
    return this.getServiceManager().get('Application').getResponse();
  }

  /**
   * Convenience: headers/status/body for both view + REST controllers
   */
  setHeader(name, value, replace = true) {
    const response = this.getResponse();
    response.setHeader(name, value, replace);

    // keep compatibility with bootstrapper logic
    if (typeof response.canSendHeaders === 'function') {
      response.canSendHeaders(true);
    }
    return this;
  }

  setHttpResponseCode(code) {
    this.getResponse().setHttpResponseCode(code);
    return this;
  }

  setStatus(code) {
    return this.setHttpResponseCode(code);
  }

  setBody(body) {
    const response = this.getResponse();

    // Prefer Response API if available
    if (typeof response.setBody === 'function') {
      response.setBody(body);
    } else {
      // legacy fallback
      response.body = body;
      response.hasBody = !(body === undefined || body === null || body === '');
    }

    if (typeof response.canSendHeaders === 'function') {
      response.canSendHeaders(true);
    }
    return this;
  }

  /**
   * JSON helper (framework-level)
   */
  json(payload, status = 200, headers = {}) {
    this.setNoRender(true);
    this.setStatus(status);

    // content-type only if not already set
    const res = this.getResponse();
    const existing = (typeof res.getHeader === 'function')
      ? res.getHeader('Content-Type')
      : null;

    if (!existing) {
      this.setHeader('Content-Type', 'application/json; charset=utf-8');
    }

    for (const [k, v] of Object.entries(headers || {})) {
      this.setHeader(k, v);
    }

    // Prefer response.json if available
    if (typeof res.json === 'function') {
      res.json(payload, status, headers);
      return this;
    }

    this.setBody(JSON.stringify(payload));
    return this;
  }

  /**
   * Session (delegate to Request wrapper)
   */
  getSession() {
    const req = this.getRequest();
    if (!req) throw new Error('Request object not available');

    if (typeof req.getSession === 'function') return req.getSession();
    // legacy
    return req.session;
  }

  setSession(session) {
    const req = this.getRequest();
    if (!req) throw new Error('Request object not available');

    if (typeof req.setSession === 'function') {
      req.setSession(session);
    } else {
      // legacy
      req.session = session;
    }
    return this;
  }

  /**
   * View model
   */
  setView(viewModel) {
    this.model = viewModel;
  }

  getView() {
    if (this.model == null) {
      this.model = new ViewModel();
      this.model.setTemplate(this.getViewScript());
    }
    return this.model;
  }

  getViewScript() {
    return this.plugin('layout').getTemplate();
  }

  /**
   * Params/Query
   */
  getParam(name, defaultValue = null) {
    const req = this.getRequest();
    if (!req) return defaultValue;

    if (typeof req.getParam === 'function') return req.getParam(name, defaultValue);
    // legacy fallback
    return (req.params && Object.prototype.hasOwnProperty.call(req.params, name))
      ? req.params[name]
      : defaultValue;
  }

  getAllParams() {
    const req = this.getRequest();
    if (!req) return {};

    if (typeof req.getParams === 'function') return req.getParams();
    // legacy fallback
    return req.params || {};
  }

  getQuery(name, defaultValue = null) {
    const req = this.getRequest();
    if (!req) return defaultValue;

    if (typeof req.getQuery === 'function') return req.getQuery(name, defaultValue);
    // legacy fallback
    const q = req.query || {};
    return Object.prototype.hasOwnProperty.call(q, name) ? q[name] : defaultValue;
  }

  /**
   * Rendering control
   */
  setNoRender(flag = true) {
    this.noRender = !!flag;
    return this;
  }

  isNoRender() {
    return this.noRender;
  }

  /**
   * Return response object (legacy hook)
   */
  returnResponse() {
    return this.returnResponse;
  }

  /**
   * Flash messenger hookup (safe)
   */
  prepareFlashMessenger() {
    try {
      const flash = this.plugin('flashMessenger');
      if (flash && typeof flash.prepareForView === 'function') {
        flash.prepareForView();
      }
    } catch (e) {
      // no-op
    }
  }

  /**
   * Dispatch lifecycle
   */
  dispatch(request = null, response = null) {
    let view = null;

    const viewModel = this.getView();
    const req = this.getRequest();

    if (viewModel && req) {
      if (typeof req.getModuleName === 'function') {
        viewModel.setVariable('_moduleName', req.getModuleName());
      }
      if (typeof req.getControllerName === 'function') {
        viewModel.setVariable('_controllerName', req.getControllerName());
      }
      if (typeof req.getActionName === 'function') {
        const action = req.getActionName();
        viewModel.setVariable('_actionName',
          StringUtil.toKebabCase(action).replace('-action', '')
        );
      }
      if (typeof req.getRouteName === 'function') {
        viewModel.setVariable('_routeName', req.getRouteName());
      }

      if (!this.noRender) {
        try {
          const authService = this.getServiceManager().get('AuthenticationService');
          const isAuthenticated = authService && authService.hasIdentity();
          viewModel.setVariable('_isAuthenticated', isAuthenticated);
        } catch (error) {
          viewModel.setVariable('_isAuthenticated', false);
        }
      }
    }

    this.preDispatch();

    if (this.getRequest().isDispatched()) {
      const actionName = this.getRequest().getActionName();
      const actionResult = this[actionName]();

      if (actionResult && typeof actionResult.then === 'function') {
        return actionResult.then(resolvedView => {
          this.postDispatch();
          return resolvedView;
        });
      }

      view = actionResult;
      this.postDispatch();
    }

    return view;
  }

  /**
   * Delimiter (legacy)
   */
  getDelimiter() {
    return this.delimiter;
  }

  setDelimiter(delimiter) {
    this.delimiter = delimiter;
  }

  /**
   * Built-in error actions
   */
  notFoundAction() {
    return this.trigger404();
  }

  serverErrorAction() {
    return this.trigger500();
  }

  /**
   * Plugin / View managers
   */
  getPluginManager() {
    if (!this.pluginManager) {
      this.pluginManager = this.getServiceManager().get('PluginManager');
      if (typeof this.pluginManager.setController === 'function') {
        this.pluginManager.setController(this);
      }
    }
    return this.pluginManager;
  }

  getViewManager() {
    if (!this.viewManager) {
      this.viewManager = this.getServiceManager().get('ViewManager');
    }
    return this.viewManager;
  }

  getViewHelperManager() {
    if (!this.viewHelperManager) {
      this.viewHelperManager = this.getServiceManager().get('ViewHelperManager');
    }
    return this.viewHelperManager;
  }

  plugin(name, options = {}) {
    return this.getPluginManager().get(name, options);
  }

  helper(name, options = {}) {
    return this.getViewHelperManager().get(name, options);
  }

  /**
   * Hooks
   */
  preDispatch() { }
  postDispatch() { }

  /**
   * Flash messages
   */
  getFlashMessages(clearAfterRead = true) {
    const flashMessenger = this.plugin('flashMessenger');
    return flashMessenger.getAllMessages(clearAfterRead);
  }

  /**
   * Error triggers (view manager integration)
   */
  trigger404(message = null, error = null) {
    const viewManager = this.getViewManager();
    const errorViewModel = viewManager.createErrorViewModel(404, message, error);

    const viewModel = new ViewModel();
    viewModel.setTemplate(errorViewModel.template);

    Object.keys(errorViewModel.variables).forEach(key => {
      viewModel.setVariable(key, errorViewModel.variables[key]);
    });

    return viewModel;
  }

  trigger500(message = null, error = null) {
    const viewManager = this.getViewManager();
    const errorViewModel = viewManager.createErrorViewModel(500, message, error);

    const viewModel = new ViewModel();
    viewModel.setTemplate(errorViewModel.template);

    Object.keys(errorViewModel.variables).forEach(key => {
      viewModel.setVariable(key, errorViewModel.variables[key]);
    });

    return viewModel;
  }
}

module.exports = BaseController;