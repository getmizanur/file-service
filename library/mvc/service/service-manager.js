const VarUtil = require('../../util/var-util');
const AbstractFactory = require('./abstract-factory');

/**
 * ServiceManager - Centralized service container and dependency injector
 * Manages application and framework service registration, instantiation,
 * and lifecycle
 * Provides lazy-loading and caching for services
 * Distinguishes between framework services (ViewManager, PluginManager,
 * etc.) and application services (Database, PostService, etc.)
 * Supports both factory pattern (complex initialization) and invokables
 * (simple instantiation)
 * Implements request-scoped services (non-cacheable) for services that
 * depend on request context
 * Inspired by Zend Framework's ServiceManager pattern
 */
class ServiceManager {

  /**
   * Constructor
   * Initializes service manager with framework and application service
   * configuration
   * Framework services are hardcoded and protected from modification
   * Application services are loaded from configuration
   * Sets up service cache and non-cacheable service list
   * @param {Object} config - Application configuration object
   */
  constructor(config = {}) {
    //this.controller = options.controller || null;
    this.config = config || {};

    // Debug: track instance
    this._instanceId = Math.random().toString(36).substr(2, 9);
    this.services = {};
    this.invokables = null;
    this.factories = null;

    // Framework-level service factories - protected from developer
    // modification
    this.frameworkFactories = {
      "ViewManager": "/library/mvc/service/factory/view-manager-factory",
      "ViewHelperManager": "/library/mvc/service/factory/" +
        "view-helper-manager-factory",
      "PluginManager": "/library/mvc/service/factory/plugin-manager-factory",
      "Application": "/library/mvc/service/factory/application-factory"
    };

    // Services that should NOT be cached (request-scoped services)
    this.nonCacheableServices = [
      "AuthenticationService", // Depends on Request session data
      "ViewHelperManager", // Must be request-scoped to hold
      // correct RouteMatch/Request
      "PluginManager" // Must be request-scoped to hold
      // correct Controller reference
    ];
  }

  /**
   * Set controller instance
   * Injects controller reference for services that need it
   * @param {BaseController} controller - Controller instance
   * @returns {ServiceManager} This manager for method chaining
   */
  setController(controller) {
    this.controller = controller;

    return this;
  }

  /**
   * Get controller instance
   * Returns the controller that services can access
   * @returns {BaseController|null} Controller instance or null if
   *                                 not set
   */
  getController() {
    return this.controller;
  }

  /**
   * Get service by name
   * Main service retrieval method with lazy-loading and caching
   * Priority order: framework factories > application factories >
   * invokables
   * Implements caching for cacheable services (singleton pattern)
   * Non-cacheable services are recreated on each request
   * @param {string} name - Service name (e.g., 'Database',
   *                        'PostService', 'ViewManager')
   * @returns {*} Service instance
   * @throws {Error} If service not found in configuration
   */
  get(name) {
    // Special case: Return application config directly
    if(name === 'Config' || name === 'config') {
      return this.getConfig();
    }

    // Lazy load configuration
    if(this.invokables == null || this.factories == null) {
      this.loadConfiguration();
    }

    // Check if this service should NOT be cached
    const isCacheable = !this.nonCacheableServices.includes(name);

    // Return cached service if exists and is cacheable
    if(isCacheable && this.services[name]) {
      return this.services[name];
    }

    // Try framework factories first (highest priority, protected)
    if(this.frameworkFactories.hasOwnProperty(name)) {
      return this.createFromFactory(name, true, isCacheable);
    }

    // Try application factories second
    if(this.factories.hasOwnProperty(name)) {
      return this.createFromFactory(name, false, isCacheable);
    }

    // Fall back to invokables (direct instantiation)
    if(this.invokables.hasOwnProperty(name)) {
      return this.createFromInvokable(name);
    }

    throw new Error(
      `Service '${name}' not found in service manager`);
  }

  /**
   * Load service configuration from application config
   * Reads service_manager.invokables and service_manager.factories
   * from application configuration
   * Called lazily on first service request
   * @returns {void}
   */
  loadConfiguration() {
    let applicationObj = this.getConfig();
    let serviceManagerObj = applicationObj.service_manager || {};

    this.invokables = serviceManagerObj.invokables || {};
    this.factories = serviceManagerObj.factories || {};
  }

  /**
   * Create service using factory pattern
   * Loads factory class, validates it, runs configuration validation,
   * and creates service
   * Supports both framework factories (built-in) and application
   * factories (custom)
   * Optionally caches service instance based on cacheable flag
   * @param {string} name - Service name
   * @param {boolean} isFramework - Whether this is a framework factory
   * @param {boolean} cacheable - Whether to cache this service
   * @returns {*} Service instance
   * @throws {Error} If factory loading, validation, or service
   *                 creation fails
   */
  createFromFactory(name, isFramework = false, cacheable = true) {
    try {
      // Get factory path from appropriate source
      const factoryPath = isFramework ?
        global.applicationPath(this.frameworkFactories[name]) :
        global.applicationPath(this.factories[name]);

      let FactoryClass = require(factoryPath);

      // Validate factory extends AbstractFactory
      if(!this.isValidFactory(FactoryClass)) {
        throw new Error(
          `Factory '${factoryPath}' must extend ` +
          `AbstractFactory`);
      }

      // Create factory instance
      let factory = new FactoryClass();

      // Validate configuration if factory supports it
      if(typeof factory.validateConfiguration === 'function' ||
        typeof factory.validateRequiredConfig === 'function') {
        let configObj = this.getConfig();

        // Check required configuration keys first
        if(typeof factory.validateRequiredConfig ===
          'function' &&
          !factory.validateRequiredConfig(configObj)) {
          throw new Error(
            `Required configuration validation failed ` +
            `for factory '${factoryPath}'`);
        }

        // Then run custom validation
        if(typeof factory.validateConfiguration === 'function' &&
          !factory.validateConfiguration(configObj)) {
          throw new Error(
            `Configuration validation failed for ` +
            `factory '${factoryPath}'`);
        }
      }

      // Create service through factory
      const service = factory.createService(this);

      // Only cache if cacheable
      if(cacheable) {
        this.services[name] = service;
      }

      console.log(
        `Service '${name}' created via factory: ` +
        `${factoryPath}${!cacheable ? ' (not cached)' : ''}`);
      return service;

    } catch (error) {
      throw new Error(
        `Failed to create service '${name}' via factory: ` +
        `${error.message}`);
    }
  }

  /**
   * Create service using direct instantiation
   * Loads service class and creates instance without factory
   * Used for simple services that don't need complex initialization
   * Always caches the created service instance
   * @param {string} name - Service name
   * @returns {*} Service instance
   * @throws {Error} If service class loading or instantiation fails
   */
  createFromInvokable(name) {
    try {
      let path = global.applicationPath(this.invokables[name]);
      let ServiceClass = require(path);

      this.services[name] = new ServiceClass();

      console.log(
        `Service '${name}' created via invokable: ${path}`);
      return this.services[name];

    } catch (error) {
      throw new Error(
        `Failed to create service '${name}' via invokable: ` +
        `${error.message}`);
    }
  }

  /**
   * Validate if factory class extends AbstractFactory
   * Checks both static marker method (implementsAbstractFactory) and
   * instanceof check
   * Validates that createService method exists on factory instance
   * Logs warnings for validation failures
   * @param {Function} FactoryClass - Factory constructor
   * @returns {boolean} True if valid factory, false otherwise
   */
  isValidFactory(FactoryClass) {
    // Check if class has static method indicating abstract factory
    // implementation
    if(typeof FactoryClass.implementsAbstractFactory ===
      'function' &&
      FactoryClass.implementsAbstractFactory()) {

      // Additional check: ensure createService method exists
      let instance;
      try {
        instance = new FactoryClass();
      } catch (error) {
        console.warn(
          `Cannot instantiate factory class: ` +
          `${error.message}`);
        return false;
      }

      if(typeof instance.createService !== 'function') {
        console.warn(
          'Factory class missing createService method');
        return false;
      }

      return true;
    }

    // Check if instance extends AbstractFactory
    try {
      let instance = new FactoryClass();
      const isValid = instance instanceof AbstractFactory;

      if(!isValid) {
        console.warn(
          'Factory class must extend AbstractFactory');
      }

      return isValid;
    } catch (error) {
      console.warn(
        `Factory validation error: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if service exists in configuration
   * Checks framework factories, application factories, and invokables
   * Config is always available as a special case
   * @param {string} name - Service name
   * @returns {boolean} True if service is registered, false otherwise
   */
  has(name) {
    // Special cases: config is always available
    if(name === 'config') {
      return true;
    }

    if(this.invokables == null || this.factories == null) {
      this.loadConfiguration();
    }

    return this.frameworkFactories.hasOwnProperty(name) ||
      this.factories.hasOwnProperty(name) ||
      this.invokables.hasOwnProperty(name);
  }

  /**
   * Check if a service is a framework service
   * Framework services are built-in and protected from override
   * @param {string} name - Service name
   * @returns {boolean} True if framework service, false otherwise
   */
  isFrameworkService(name) {
    return this.frameworkFactories.hasOwnProperty(name);
  }

  /**
   * Get list of framework service names
   * Returns array of built-in framework services
   * Useful for debugging and documentation
   * @returns {Array<string>} Array of framework service names
   */
  getFrameworkServiceNames() {
    return Object.keys(this.frameworkFactories);
  }

  /**
   * Validate that application services don't accidentally override
   * framework services
   * Checks for naming conflicts between application and framework
   * services
   * Returns array of conflicting service names
   * @param {Object} applicationFactories - Application factories to
   *                                        validate
   * @returns {Array<string>} Array of conflicts (empty if no
   *                          conflicts)
   */
  validateApplicationServices(applicationFactories = {}) {
    const conflicts = [];
    Object.keys(applicationFactories).forEach(serviceName => {
      if(this.isFrameworkService(serviceName)) {
        conflicts.push(serviceName);
      }
    });
    return conflicts;
  }

  /**
   * Get all available service names (framework + application)
   * Returns combined list of all registered services
   * Useful for debugging and documentation
   * @returns {Array<string>} Array of all service names
   */
  getAvailableServices() {
    if(this.invokables == null || this.factories == null) {
      this.loadConfiguration();
    }

    return [
      ...Object.keys(this.factories),
      ...Object.keys(this.invokables)
    ];
  }

  /**
   * Clear cached service instance
   * Removes service from cache, forcing recreation on next request
   * Useful for testing or forcing service refresh
   * @param {string} name - Service name
   * @returns {ServiceManager} This manager for method chaining
   */
  clearService(name) {
    if(this.services[name]) {
      delete this.services[name];
    }
    return this;
  }

  /**
   * Clear all cached services
   * Removes all services from cache
   * Useful for testing or forcing complete service refresh
   * @returns {ServiceManager} This manager for method chaining
   */
  clearAllServices() {
    this.services = {};
    return this;
  }

  /**
   * Get application configuration
   * Loads configuration from file if not already loaded
   * Returns cached configuration on subsequent calls
   * @returns {Object} Application configuration object
   */
  getConfig() {
    if(VarUtil.empty(this.config)) {
      this.config = require(
        '../../../application/config/application.config');
      return this.config;
    }

    return this.config;
  }

  /**
   * Get class name
   * Returns the name of this class (ServiceManager)
   * Useful for debugging and logging
   * @returns {string} Class name
   */
  getClass() {
    return this.constructor.name;
  }

}

module.exports = ServiceManager;