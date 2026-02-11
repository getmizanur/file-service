/**
 * ViewHelperManager - Manages framework and application view helpers
 *
 * This class follows the Zend Framework pattern of separating framework-level
 * helpers from application-specific helpers. Framework helpers are pre-registered
 * and protected from accidental modification by developers.
 */
class ViewHelperManager {

  constructor(applicationHelpers = {}, serviceManager = null) {
    // Validate application helpers don't override framework helpers
    const conflicts = this._checkConflicts(applicationHelpers);
    if (conflicts.length > 0) {
      throw new Error(`Application helpers cannot override framework helpers. Conflicts: ${conflicts.join(', ')}`);
    }

    // Separate invokables and factories from application helpers
    this.applicationHelpers = applicationHelpers.invokables || applicationHelpers;
    this.applicationFactories = applicationHelpers.factories || {};
    this.instances = {}; // Cache for instantiated helpers
    this.serviceManager = serviceManager; // Store reference to ServiceManager

    // Framework-level helpers - protected from developer modification
    this.frameworkHelpers = {
      "invokables": {
        "form": {
          "class": "/library/mvc/view/helper/form",
          "params": []
        },
        "formButton": {
          "class": "/library/mvc/view/helper/form-button",
          "params": ["element"]
        },
        "formError": {
          "class": "/library/mvc/view/helper/form-error",
          "params": ["element", "attributes = null"]
        },
        "formFile": {
          "class": "/library/mvc/view/helper/form-file",
          "params": ["element"]
        },
        "formHidden": {
          "class": "/library/mvc/view/helper/form-hidden",
          "params": ["element"]
        },
        "formLabel": {
          "class": "/library/mvc/view/helper/form-label",
          "params": ["elementOrAttribs", "labelContent = null"]
        },
        "formPassword": {
          "class": "/library/mvc/view/helper/form-password",
          "params": ["element", "extraAttribs = {}"]
        },
        "formRadio": {
          "class": "/library/mvc/view/helper/form-radio",
          "params": ["element", "value = null"]
        },
        "formSubmit": {
          "class": "/library/mvc/view/helper/form-submit",
          "params": ["element"]
        },
        "formText": {
          "class": "/library/mvc/view/helper/form-text",
          "params": ["element", "extraAttribs = {}"]
        },
        "formTextarea": {
          "class": "/library/mvc/view/helper/form-textarea",
          "params": ["element", "extraAttribs = {}"]
        },
        "formSelect": {
          "class": "/library/mvc/view/helper/form-select",
          "params": ["element", "extraAttribs = {}"]
        },
        "formCheckbox": {
          "class": "/library/mvc/view/helper/form-checkbox",
          "params": ["element", "extraAttribs = {}"]
        },
        "headMeta": {
          "class": "/library/mvc/view/helper/head-meta",
          "params": ["nameOrProperty = null", "content = null", "mode = 'add'"]
        },
        "headLink": {
          "class": "/library/mvc/view/helper/head-link",
          "params": ["attributes = null", "mode = 'add'"]
        },
        "headScript": {
          "class": "/library/mvc/view/helper/head-script",
          "params": ["scriptOrAttributes = null", "mode = 'append'", "attributes = {}"]
        },
        "formCsrf": {
          "class": "/library/mvc/view/helper/form-csrf",
          "params": ["element"]
        },
        "escapeHtml": {
          "class": "/library/mvc/view/helper/escape-html",
          "params": ["value"]
        }
      },
      "factories": {
        "headTitle": "/library/mvc/view/helper/factory/head-title-factory",
        "url": "/library/mvc/view/helper/factory/url-factory",
        "params": "/library/mvc/view/helper/factory/params-factory"
      }
    };
  }

  /**
   * Get all helpers - merges framework helpers with application helpers
   * @param {Object} applicationHelpers - Custom helpers from application config
   * @returns {Object} Combined helpers object
   */
  getAllHelpers(applicationHelpers = {}) {
    // Framework helpers take precedence to prevent accidental override
    // But allow explicit override if developer really needs it
    return {
      ...this.frameworkHelpers.invokables,
      ...applicationHelpers
    };
  }

  /**
   * Get only framework helpers
   * @returns {Object} Framework helpers
   */
  getFrameworkHelpers() {
    return {
      ...this.frameworkHelpers.invokables
    };
  }

  /**
   * Check if a helper is a framework helper
   * @param {string} helperName - Name of the helper
   * @returns {boolean} True if framework helper
   */
  isFrameworkHelper(helperName) {
    return this.frameworkHelpers.invokables.hasOwnProperty(helperName);
  }

  /**
   * Get list of framework helper names
   * @returns {Array} Array of framework helper names
   */
  getFrameworkHelperNames() {
    return Object.keys(this.frameworkHelpers.invokables);
  }

  /**
   * Validate that application helpers don't accidentally override framework helpers
   * @param {Object} applicationHelpers - Application helpers to validate
   * @returns {Array} Array of conflicts (if any)
   */
  validateApplicationHelpers(applicationHelpers = {}) {
    const conflicts = [];
    Object.keys(applicationHelpers).forEach(helperName => {
      if (this.isFrameworkHelper(helperName)) {
        conflicts.push(helperName);
      }
    });
    return conflicts;
  }

  /**
   * Internal method to check for conflicts
   * @param {Object} applicationHelpers - Application helpers to check
   * @returns {Array} Array of conflicts
   */
  _checkConflicts(applicationHelpers) {
    const conflicts = [];
    Object.keys(applicationHelpers).forEach(helperName => {
      if (this.frameworkHelpers && this.frameworkHelpers.invokables && this.frameworkHelpers.invokables.hasOwnProperty(helperName)) {
        conflicts.push(helperName);
      }
    });
    return conflicts;
  }

  /**
   * Get a helper instance by name
   * Instantiates the helper if not already cached
   * Factory helpers are NOT cached - created fresh per request
   * @param {string} name - Helper name
   * @returns {object} Helper instance
   */
  get(name) {
    // Check if this is a factory helper - if so, skip cache and create fresh
    const isFactory = this.applicationFactories.hasOwnProperty(name);

    // Return cached instance if available (not for factories)
    if (!isFactory && this.instances[name]) {
      return this.instances[name];
    }

    // Check framework helpers first
    if (this.frameworkHelpers.invokables[name]) {
      const helperConfig = this.frameworkHelpers.invokables[name];
      const HelperClass = require(global.applicationPath(helperConfig.class));
      const instance = new HelperClass();

      // Set nunjucks context if available
      if (global.nunjucksContext) {
        instance.setContext(global.nunjucksContext);
      }

      this.instances[name] = instance;
      return instance;
    }

    // Check framework factories
    if (this.frameworkHelpers.factories && this.frameworkHelpers.factories[name]) {
      // Cache factory helpers that need to maintain state across request (like headTitle)
      if (this.instances[name]) {
        return this.instances[name];
      }

      const factoryPath = this.frameworkHelpers.factories[name];
      const FactoryClass = require(global.applicationPath(factoryPath));
      const factory = new FactoryClass();

      // Create helper through factory with ServiceManager
      const instance = factory.createService(this.serviceManager);

      // Set nunjucks context if available
      if (global.nunjucksContext) {
        instance.setContext(global.nunjucksContext);
      }

      // Cache the instance for reuse within the same request
      this.instances[name] = instance;

      return instance;
    }

    // Check application factories
    if (this.applicationFactories[name]) {
      const factoryPath = this.applicationFactories[name];
      const FactoryClass = require(global.applicationPath(factoryPath));
      const factory = new FactoryClass();

      // Create helper through factory with ServiceManager
      // DO NOT CACHE factory helpers - they need fresh ServiceManager state per request
      const instance = factory.createService(this.serviceManager);

      // Set nunjucks context if available
      if (global.nunjucksContext) {
        instance.setContext(global.nunjucksContext);
      }

      // DO NOT cache: this.instances[name] = instance;
      return instance;
    }

    // Check application invokable helpers
    if (this.applicationHelpers[name]) {
      const helperConfig = this.applicationHelpers[name];
      const HelperClass = require(global.applicationPath(helperConfig.class));
      const instance = new HelperClass();

      // Set nunjucks context if available
      if (global.nunjucksContext) {
        instance.setContext(global.nunjucksContext);
      }

      this.instances[name] = instance;
      return instance;
    }

    throw new Error(`Helper '${name}' not found in ViewHelperManager`);
  }

  /**
   * Check if a helper exists
   * @param {string} name - Helper name
   * @returns {boolean} True if helper exists
   */
  has(name) {
    return this.frameworkHelpers.invokables.hasOwnProperty(name) ||
      (this.frameworkHelpers.factories && this.frameworkHelpers.factories.hasOwnProperty(name)) ||
      this.applicationHelpers.hasOwnProperty(name) ||
      this.applicationFactories.hasOwnProperty(name);
  }

  /**
   * Get all available helper names
   * @returns {Array} Array of helper names
   */
  getAvailableHelpers() {
    return [
      ...Object.keys(this.frameworkHelpers.invokables),
      ...(this.frameworkHelpers.factories ? Object.keys(this.frameworkHelpers.factories) : []),
      ...Object.keys(this.applicationHelpers),
      ...Object.keys(this.applicationFactories)
    ];
  }

  /**
   * Get the ServiceManager instance
   * @returns {ServiceManager|null} ServiceManager instance or null if not set
   */
  getServiceManager() {
    return this.serviceManager;
  }

  /**
   * Set the ServiceManager instance
   * @param {ServiceManager} serviceManager - ServiceManager instance
   * @returns {ViewHelperManager} For method chaining
   */
  setServiceManager(serviceManager) {
    this.serviceManager = serviceManager;
    return this;
  }

}

module.exports = ViewHelperManager;