// library/mvc/view/view-helper-manager.js
/**
 * ViewHelperManager - Manages framework and application view helpers
 *
 * Framework helpers are pre-registered and protected from accidental modification.
 * Helpers may be stateful (e.g. headTitle/headScript collectors), so this manager
 * should be treated as request-scoped OR reset per request.
 */
class ViewHelperManager {

  constructor(applicationHelpers = {}, serviceManager = null) {
    // Normalize application helper config
    const appInvokables = applicationHelpers.invokables || applicationHelpers || {};
    const appFactories = applicationHelpers.factories || {};

    // Framework-level helpers - protected from developer modification
    this.frameworkHelpers = {
      invokables: {
        form: { class: "/library/mvc/view/helper/form", params: [] },
        formButton: { class: "/library/mvc/view/helper/form-button", params: ["element"] },
        formError: { class: "/library/mvc/view/helper/form-error", params: ["element", "attributes = null"] },
        formFile: { class: "/library/mvc/view/helper/form-file", params: ["element"] },
        formHidden: { class: "/library/mvc/view/helper/form-hidden", params: ["element"] },
        formLabel: { class: "/library/mvc/view/helper/form-label", params: ["elementOrAttribs", "labelContent = null"] },
        formPassword: { class: "/library/mvc/view/helper/form-password", params: ["element", "extraAttribs = {}"] },
        formRadio: { class: "/library/mvc/view/helper/form-radio", params: ["element", "value = null"] },
        formSubmit: { class: "/library/mvc/view/helper/form-submit", params: ["element"] },
        formText: { class: "/library/mvc/view/helper/form-text", params: ["element", "extraAttribs = {}"] },
        formTextarea: { class: "/library/mvc/view/helper/form-textarea", params: ["element", "extraAttribs = {}"] },
        formSelect: { class: "/library/mvc/view/helper/form-select", params: ["element", "extraAttribs = {}"] },
        formCheckbox: { class: "/library/mvc/view/helper/form-checkbox", params: ["element", "extraAttribs = {}"] },
        headMeta: { class: "/library/mvc/view/helper/head-meta", params: ["nameOrProperty = null", "content = null", "mode = 'add'"] },
        headLink: { class: "/library/mvc/view/helper/head-link", params: ["attributes = null", "mode = 'add'"] },
        headScript: { class: "/library/mvc/view/helper/head-script", params: ["scriptOrAttributes = null", "mode = 'append'", "attributes = {}"] },
        formCsrf: { class: "/library/mvc/view/helper/form-csrf", params: ["element"] },
        escapeHtml: { class: "/library/mvc/view/helper/escape-html", params: ["value"] }
      },
      factories: {
        headTitle: "/library/mvc/view/helper/factory/head-title-factory",
        url: "/library/mvc/view/helper/factory/url-factory",
        params: "/library/mvc/view/helper/factory/params-factory"
      }
    };

    // Validate application helpers don't override framework helpers
    const conflicts = this._checkConflicts(appInvokables, appFactories);
    if (conflicts.length > 0) {
      throw new Error(
        `Application helpers cannot override framework helpers. Conflicts: ${conflicts.join(', ')}`
      );
    }

    this.applicationHelpers = appInvokables;
    this.applicationFactories = appFactories;

    // cache of instantiated helpers (request-scoped)
    this.instances = {};

    this.serviceManager = serviceManager;

    // request-scoped context holder (avoid global.nunjucksContext)
    this.context = null;
  }

  /**
   * Set the current render context (e.g., nunjucks context).
   * Call this per request before rendering.
   */
  setContext(context) {
    this.context = context || null;
    return this;
  }

  getContext() {
    return this.context;
  }

  /**
   * Reset helper instances (call per request).
   * This prevents state leakage for stateful helpers.
   */
  reset() {
    this.instances = {};
    this.context = null;
    return this;
  }

  /**
   * Get combined helper config (framework + application).
   * NOTE: This returns config objects, not instantiated helpers.
   */
  getAllHelpers(applicationHelpers = {}) {
    const appInvokables = applicationHelpers.invokables || applicationHelpers || {};
    return {
      ...this.frameworkHelpers.invokables,
      ...appInvokables
    };
  }

  getFrameworkHelpers() {
    return { ...this.frameworkHelpers.invokables };
  }

  isFrameworkHelper(helperName) {
    return Object.prototype.hasOwnProperty.call(this.frameworkHelpers.invokables, helperName) ||
      (this.frameworkHelpers.factories && Object.prototype.hasOwnProperty.call(this.frameworkHelpers.factories, helperName));
  }

  getFrameworkHelperNames() {
    return [
      ...Object.keys(this.frameworkHelpers.invokables),
      ...(this.frameworkHelpers.factories ? Object.keys(this.frameworkHelpers.factories) : [])
    ];
  }

  validateApplicationHelpers(applicationHelpers = {}) {
    const appInvokables = applicationHelpers.invokables || applicationHelpers || {};
    const appFactories = applicationHelpers.factories || {};
    return this._checkConflicts(appInvokables, appFactories);
  }

  _checkConflicts(appInvokables, appFactories) {
    const conflicts = [];

    Object.keys(appInvokables || {}).forEach(name => {
      if (Object.prototype.hasOwnProperty.call(this.frameworkHelpers.invokables, name)) conflicts.push(name);
      if (this.frameworkHelpers.factories && Object.prototype.hasOwnProperty.call(this.frameworkHelpers.factories, name)) conflicts.push(name);
    });

    Object.keys(appFactories || {}).forEach(name => {
      if (Object.prototype.hasOwnProperty.call(this.frameworkHelpers.invokables, name)) conflicts.push(name);
      if (this.frameworkHelpers.factories && Object.prototype.hasOwnProperty.call(this.frameworkHelpers.factories, name)) conflicts.push(name);
    });

    // uniq
    return Array.from(new Set(conflicts));
  }

  /**
   * Apply context to a helper instance if supported
   * @private
   */
  _applyContext(instance) {
    const ctx = this.context;
    if (ctx && instance && typeof instance.setContext === 'function') {
      instance.setContext(ctx);
    }
    return instance;
  }

  /**
   * Get a helper instance by name.
   * - Invokables are cached per request (instances[name])
   * - Framework factory helpers are cached per request (headTitle should maintain state within request)
   * - Application factory helpers are NOT cached by default
   */
  get(name) {
    // Cached?
    if (this.instances[name]) {
      return this._applyContext(this.instances[name]);
    }

    // Framework invokables
    if (Object.prototype.hasOwnProperty.call(this.frameworkHelpers.invokables, name)) {
      const helperConfig = this.frameworkHelpers.invokables[name];
      const HelperClass = require(global.applicationPath(helperConfig.class));
      const instance = new HelperClass();

      // cache per request
      this.instances[name] = instance;
      return this._applyContext(instance);
    }

    // Framework factories (cached per request)
    if (this.frameworkHelpers.factories && Object.prototype.hasOwnProperty.call(this.frameworkHelpers.factories, name)) {
      const factoryPath = this.frameworkHelpers.factories[name];
      const FactoryClass = require(global.applicationPath(factoryPath));
      const factory = new FactoryClass();

      const instance = factory.createService(this.serviceManager);

      // cache per request
      this.instances[name] = instance;
      return this._applyContext(instance);
    }

    // Application factories (NOT cached by default)
    if (Object.prototype.hasOwnProperty.call(this.applicationFactories, name)) {
      const factoryPath = this.applicationFactories[name];
      const FactoryClass = require(global.applicationPath(factoryPath));
      const factory = new FactoryClass();

      const instance = factory.createService(this.serviceManager);
      return this._applyContext(instance);
    }

    // Application invokables (cached per request)
    if (Object.prototype.hasOwnProperty.call(this.applicationHelpers, name)) {
      const helperConfig = this.applicationHelpers[name];
      const HelperClass = require(global.applicationPath(helperConfig.class));
      const instance = new HelperClass();

      this.instances[name] = instance;
      return this._applyContext(instance);
    }

    throw new Error(`Helper '${name}' not found in ViewHelperManager`);
  }

  has(name) {
    return Object.prototype.hasOwnProperty.call(this.frameworkHelpers.invokables, name) ||
      (this.frameworkHelpers.factories && Object.prototype.hasOwnProperty.call(this.frameworkHelpers.factories, name)) ||
      Object.prototype.hasOwnProperty.call(this.applicationHelpers, name) ||
      Object.prototype.hasOwnProperty.call(this.applicationFactories, name);
  }

  getAvailableHelpers() {
    return [
      ...Object.keys(this.frameworkHelpers.invokables),
      ...(this.frameworkHelpers.factories ? Object.keys(this.frameworkHelpers.factories) : []),
      ...Object.keys(this.applicationHelpers),
      ...Object.keys(this.applicationFactories)
    ];
  }

  getServiceManager() {
    return this.serviceManager;
  }

  setServiceManager(serviceManager) {
    this.serviceManager = serviceManager;
    return this;
  }
}

module.exports = ViewHelperManager;