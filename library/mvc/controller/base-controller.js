const StringUtil = require('../../util/string-util');
const ViewModel = require('../view/view-model');
const ServiceManager = require('../service/service-manager');

/**
 * BaseController - Abstract base class for all MVC controllers
 * Provides core controller functionality including request/response handling,
 * view management, plugin system, and service manager integration
 * Inspired by Zend Framework's AbstractActionController pattern
 * All application controllers should extend this class
 */
class BaseController {

  /**
   * Constructor
   * Initializes controller with service manager and plugin support
   * @param {Object} options - Configuration options
   * @param {Object} options.container - Dependency injection container
   * @param {ServiceManager} options.serviceManager - Service manager
   *                                                   instance
   */
  constructor(options = {}) {
    this.container = options.container || null;
    this.serviceManager = options.serviceManager || null;

    if (this.serviceManager) {
      this.serviceManager.setController(this);
    }

    this.method = null;

    this.moduleName = null;
    this.controllerName = null;
    this.actionName = null;

    this.model = null;

    this.delimiter = null;

    this.pluginManager = null;
    this.returnResponse = null;
    this.dispatched = false;
    this.view = null;

    this.noRender = false;
  }

  /**
   * Set service manager instance
   * Establishes bidirectional relationship between controller and
   * service manager
   * @param {ServiceManager} serviceManager - Service manager instance
   * @returns {BaseController} This controller for method chaining
   */
  setServiceManager(serviceManager) {
    this.serviceManager = serviceManager;
    this.serviceManager.setController(this);

    return this;
  }

  /**
   * Get service manager instance
   * Provides access to all registered services (Database,
   * Authentication, etc.)
   * @returns {ServiceManager} Service manager instance
   * @throws {Error} If ServiceManager not injected
   */
  getServiceManager() {
    if (!this.serviceManager) {
      throw new Error(
        'ServiceManager not injected into Controller');
    }
    return this.serviceManager;
  }

  /**
   * Get application configuration
   * Shortcut to retrieve config from service manager
   * @returns {Object} Application configuration object
   */
  getConfig() {
    return this.getServiceManager().get('Config');
  }

  /**
   * Get current request object
   * Provides access to HTTP request data (GET, POST, params, headers)
   * @returns {Request} Request object from Application service
   */
  getRequest() {
    return this.getServiceManager().get('Application').getRequest();
  }

  /**
   * Get current response object
   * Provides access to HTTP response (headers, status, redirects)
   * @returns {Response} Response object from Application service
   */
  getResponse() {
    return this.getServiceManager().get('Application').getResponse();
  }

  /**
   * Convenience: Set HTTP header on framework Response
   * @param {string} name
   * @param {string} value
   * @param {boolean} replace
   * @returns {BaseController}
   */
  setHeader(name, value, replace = true) {
    const response = this.getResponse();
    response.setHeader(name, value, replace);

    // Ensure headers are flushed later
    response.canSendHeaders(true);

    return this;
  }

  /**
   * Set HTTP status code on framework Response
   * Works for both view and REST controllers.
   */
  setHttpResponseCode(code) {
    const response = this.getResponse();
    response.setHttpResponseCode(code);
    return this;
  }

  /**
   * Convenience: Set HTTP status code on framework Response
   * @param {number} code
   * @returns {BaseController}
   */
  setStatus(code) {
    this.getResponse().setHttpResponseCode(code);
    return this;
  }

  /**
   * Convenience: Set raw response body on framework Response.
   * We intentionally store body on the Response instance so the Bootstrapper
   * can flush it to Express.
   * @param {string|Buffer} body
   * @returns {BaseController}
   */
  setBody(body) {
    const response = this.getResponse();
    response.body = body;
    response.hasBody = true;

    // Ensure bootstrapper flushes
    response.canSendHeaders(true);

    return this;
  }

  /**
   * Convenience: JSON response helper
   * @param {*} payload
   * @param {number} status
   * @param {Object} headers
   * @returns {BaseController}
   */
  json(payload, status = 200, headers = {}) {
    this.setNoRender(true);
    this.setStatus(status);

    // Only set content-type if not already set by caller
    const existing = this.getResponse().getHeader('Content-Type');
    if (!existing) {
      this.setHeader('Content-Type', 'application/json; charset=utf-8');
    }

    for (const [k, v] of Object.entries(headers || {})) {
      this.setHeader(k, v);
    }

    this.setBody(JSON.stringify(payload));
    return this;
  }

  /**
   * Get Express session object
   * Provides access to user session data stored in Redis
   * @returns {Object} Express session object
   * @throws {Error} If request object not available
   */
  getSession() {
    if (!this.getRequest()) {
      throw new Error('Request object not available');
    }
    return this.getRequest().session;
  }

  /**
   * Set Express session object
   * Allows replacing the session object (used for regeneration)
   * @param {Object} session - Express session object
   * @returns {BaseController} This controller for method chaining
   * @throws {Error} If request object not available
   */
  setSession(session) {
    if (!this.getRequest()) {
      throw new Error('Request object not available');
    }
    this.getRequest().session = session;
    return this;
  }

  /**
   * Set view model
   * Allows injecting a pre-configured view model
   * @param {ViewModel} viewModel - View model instance
   * @returns {void}
   */
  setView(viewModel) {
    this.model = viewModel;
  }

  /**
   * Get view model
   * Creates a new view model if one doesn't exist
   * Automatically sets template based on current route
   * @returns {ViewModel} View model instance
   */
  getView() {
    if (this.model == null) {
      this.model = new ViewModel();
      this.model.setTemplate(this.getViewScript());
    }
    return this.model;
  }

  /**
   * Get view script path
   * Determines template path based on module/controller/action
   * @returns {string} View template path
   */
  getViewScript() {
    return this.plugin('layout').getTemplate();
  }

  /**
   * Get route parameter value
   * Retrieves parameter from matched route (e.g., /post/:id)
   * @param {string} name - Parameter name
   * @param {*} defaultValue - Default value if parameter not found
   * @returns {*} Parameter value or default
   */
  getParam(name, defaultValue = null) {
    let value = this.getRequest().getParam(name, defaultValue);

    return value;
  }

  /**
   * Get all route parameters
   * Returns object with all matched route parameters
   * @returns {Object} All route parameters
   */
  getAllParams() {
    return this.getRequest().getParams();
  }

  /**
   * Get query string parameter
   * Retrieves value from URL query string (e.g., ?search=term)
   * @param {string} name - Query parameter name
   * @param {*} defaultValue - Default value if parameter not found
   * @returns {*} Query parameter value or default
   */
  getQuery(name, defaultValue = null) {
    let value = this.getRequest().getQuery(name, defaultValue);

    return value;
  }

  setNoRender(flag = true) {
    this.noRender = !!flag;
    return this;
  }

  isNoRender() {
    return this.noRender;
  }

  /**
   * Return response object
   * Gets the response to be sent to client
   * @returns {Response|null} Response object or null
   */
  returnResponse() {
    return this.returnResponse;
  }

  /**
   * Central hook to prepare flash messages before rendering
   * Call this once per request, at the end of dispatch method,
   * just before rendering the view
   * Ensures flash messages are available in templates
   * @returns {void}
   */
  prepareFlashMessenger() {
    try {
      const flash = this.plugin('flashMessenger');
      if (flash && typeof flash.prepareForView === 'function') {
        flash.prepareForView();
      }
    } catch (e) {
      // swallow – no flash messages is fine
    }
  }

  /**
   * Dispatch controller action
   * Main dispatch lifecycle: preDispatch -> action -> postDispatch
   * Sets up view variables (module, controller, action names)
   * Handles both synchronous and asynchronous actions
   * @param {Request} request - Request object (ignored, uses
   *                            Application service)
   * @param {Response} response - Response object (ignored, uses
   *                              Application service)
   * @returns {ViewModel|Promise<ViewModel>} View model or promise
   *                                          resolving to view model
   */
  dispatch(request = null, response = null) {
    let view = null;

    // request and response arguments are ignored as we use the
    // Application service source of truth

    // Set module and controller metadata as template variables
    // (before preDispatch to ensure availability)
    const viewModel = this.getView();
    const req = this.getRequest();
    if (viewModel && req) {
      // Set module name (from route)
      if (typeof req.getModuleName === 'function') {
        viewModel.setVariable('_moduleName',
          req.getModuleName());
      }

      // Set controller name (from route)
      if (typeof req.getControllerName === 'function') {
        viewModel.setVariable('_controllerName',
          req.getControllerName());
      }

      // Set action name (from route)
      if (typeof req.getActionName === 'function') {
        let action = req.getActionName();
        viewModel.setVariable('_actionName',
          StringUtil.toKebabCase(action)
            .replace('-action', ''));
      }

      // Set route name for convenience
      if (typeof req.getRouteName === 'function') {
        viewModel.setVariable('_routeName',
          req.getRouteName());
      }

      // Set authentication status for navigation helpers
      try {
        const authService = this.getServiceManager()
          .get('AuthenticationService');
        const isAuthenticated = authService &&
          authService.hasIdentity();
        viewModel.setVariable('_isAuthenticated',
          isAuthenticated);
      } catch (error) {
        // AuthenticationService may not be available in all
        // contexts
        viewModel.setVariable('_isAuthenticated', false);
      }
    }

    this.preDispatch();
    if (this.getRequest().isDispatched()) {
      const actionResult = this[this.getRequest().getActionName()]();
      // Handle async actions that return promises
      if (actionResult &&
        typeof actionResult.then === 'function') {
        // Return the promise so the bootstrapper can await it
        return actionResult.then(resolvedView => {
          this.postDispatch();
          return resolvedView;
        });
      } else {
        view = actionResult;
      }

      this.postDispatch();
    }

    return view;
  }

  /**
   * Get delimiter
   * Gets delimiter used for path/URL construction
   * @returns {string|null} Delimiter string or null
   */
  getDelimiter() {
    return this.delimiter;
  }

  /**
   * Set delimiter
   * Sets delimiter for path/URL construction
   * @param {string} delimiter - Delimiter string
   * @returns {void}
   */
  setDelimiter(delimiter) {
    this.delimiter = delimiter;
  }

  /**
   * Not found action
   * Framework-level 404 handling
   * Delegates to trigger404 for consistency
   * @returns {ViewModel} 404 error view model
   */
  notFoundAction() {
    // Framework-level 404 handling - delegate to trigger404
    // for consistency
    return this.trigger404();
  }

  /**
   * Server error action
   * Framework-level 500 handling
   * Delegates to trigger500 for consistency
   * @returns {ViewModel} 500 error view model
   */
  serverErrorAction() {
    // Framework-level 500 handling - delegate to trigger500
    // for consistency
    return this.trigger500();
  }

  /**
   * Get plugin manager
   * Lazy-loads and returns the plugin manager for controller plugins
   * Plugins provide reusable functionality (redirect, url, params, etc.)
   * @returns {PluginManager} Plugin manager instance
   */
  getPluginManager() {
    if (!this.pluginManager) {
      this.pluginManager = this.getServiceManager()
        .get('PluginManager');
      this.pluginManager.setController(this);
    }
    return this.pluginManager;
  }

  /**
   * Get view manager
   * Lazy-loads and returns the view manager for rendering templates
   * @returns {ViewManager} View manager instance
   */
  getViewManager() {
    if (!this.viewManager) {
      this.viewManager = this.getServiceManager()
        .get('ViewManager');
    }
    return this.viewManager;
  }

  /**
   * Get view helper manager
   * Lazy-loads and returns the view helper manager
   * View helpers provide template utilities (headTitle, url, etc.)
   * @returns {ViewHelperManager} View helper manager instance
   */
  getViewHelperManager() {
    if (!this.viewHelperManager) {
      this.viewHelperManager = this.getServiceManager()
        .get('ViewHelperManager');
    }
    return this.viewHelperManager;
  }

  /**
   * Get controller plugin
   * Retrieves and invokes a controller plugin by name
   * Common plugins: redirect, url, params, flashMessenger, layout
   * @param {string} name - Plugin name
   * @param {Object} options - Plugin options
   * @returns {*} Plugin instance
   */
  plugin(name, options = {}) {
    return this.getPluginManager().get(name, options);
  }

  /**
   * Get view helper
   * Retrieves a view helper by name for use in controllers
   * Common helpers: headTitle, url, escapeHtml
   * @param {string} name - Helper name
   * @param {Object} options - Helper options
   * @returns {*} Helper instance
   */
  helper(name, options = {}) {
    return this.getViewHelperManager().get(name, options);
  }

  /**
   * Pre-dispatch hook
   * Called before action execution
   * Override in child controllers for authentication checks,
   * permission verification, etc.
   * @returns {void|Response} Return redirect response to
   *                          short-circuit dispatch
   */
  preDispatch() { }

  /**
   * Post-dispatch hook
   * Called after action execution
   * Override in child controllers for cleanup, logging, etc.
   * @returns {void}
   */
  postDispatch() { }


  /**
   * Helper method to get flash messages for views
   * Flash messages are one-time notifications stored in session
   * Used for success/error messages after redirects
   * @param {boolean} clearAfterRead - Whether to clear messages
   *                                   after reading (default: true)
   * @returns {Object} Flash messages organized by type (success,
   *                   error, info, warning)
   */
  getFlashMessages(clearAfterRead = true) {
    const flashMessenger = this.plugin('flashMessenger');
    return flashMessenger.getAllMessages(clearAfterRead);
  }

  /**
   * Programmatically trigger 404 page
   * Similar to Zend Framework's forward to not-found action
   * Creates a 404 error view model with custom message
   * @param {string} message - Custom error message
   * @param {Error} error - Optional error object for debugging
   * @returns {ViewModel} 404 view model
   */
  trigger404(message = null, error = null) {
    const viewManager = this.getViewManager();
    const errorViewModel = viewManager.createErrorViewModel(404,
      message, error);

    const viewModel = new ViewModel();
    viewModel.setTemplate(errorViewModel.template);

    // Set all variables from the view manager
    Object.keys(errorViewModel.variables).forEach(key => {
      viewModel.setVariable(key, errorViewModel.variables[key]);
    });

    return viewModel;
  }

  /**
   * Programmatically trigger 500 server error page
   * Similar to Zend Framework's exception handling
   * Creates a 500 error view model with custom message
   * @param {string} message - Custom error message
   * @param {Error} error - Optional error object for debugging
   * @returns {ViewModel} 500 view model
   */
  trigger500(message = null, error = null) {
    const viewManager = this.getViewManager();
    const errorViewModel = viewManager.createErrorViewModel(500,
      message, error);

    const viewModel = new ViewModel();
    viewModel.setTemplate(errorViewModel.template);

    // Set all variables from the view manager
    Object.keys(errorViewModel.variables).forEach(key => {
      viewModel.setVariable(key, errorViewModel.variables[key]);
    });

    return viewModel;
  }

}

module.exports = BaseController;