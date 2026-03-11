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
        form: "/library/mvc/view/helper/form",
        formButton: "/library/mvc/view/helper/form-button",
        formError: "/library/mvc/view/helper/form-error",
        formFile: "/library/mvc/view/helper/form-file",
        formHidden: "/library/mvc/view/helper/form-hidden",
        formLabel: "/library/mvc/view/helper/form-label",
        formPassword: "/library/mvc/view/helper/form-password",
        formRadio: "/library/mvc/view/helper/form-radio",
        formSubmit: "/library/mvc/view/helper/form-submit",
        formText: "/library/mvc/view/helper/form-text",
        formTextarea: "/library/mvc/view/helper/form-textarea",
        formSelect: "/library/mvc/view/helper/form-select",
        formCheckbox: "/library/mvc/view/helper/form-checkbox",
        headMeta: "/library/mvc/view/helper/head-meta",
        headLink: "/library/mvc/view/helper/head-link",
        headScript: "/library/mvc/view/helper/head-script",
        formCsrf: "/library/mvc/view/helper/form-csrf",
        escapeHtml: "/library/mvc/view/helper/escape-html"
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

    // request-scoped context holder (avoid globalThis.nunjucksContext)
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
    return Object.hasOwn(this.frameworkHelpers.invokables, helperName) ||
      (this.frameworkHelpers.factories && Object.hasOwn(this.frameworkHelpers.factories, helperName));
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
      if (Object.hasOwn(this.frameworkHelpers.invokables, name)) conflicts.push(name);
      if (this.frameworkHelpers.factories && Object.hasOwn(this.frameworkHelpers.factories, name)) conflicts.push(name);
    });

    Object.keys(appFactories || {}).forEach(name => {
      if (Object.hasOwn(this.frameworkHelpers.invokables, name)) conflicts.push(name);
      if (this.frameworkHelpers.factories && Object.hasOwn(this.frameworkHelpers.factories, name)) conflicts.push(name);
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
    if (Object.hasOwn(this.frameworkHelpers.invokables, name)) {
      const helperConfig = this.frameworkHelpers.invokables[name];
      const helperPath = typeof helperConfig === 'string' ? helperConfig : helperConfig.class;
      const HelperClass = require(globalThis.applicationPath(helperPath));
      const instance = new HelperClass();

      // cache per request
      this.instances[name] = instance;
      return this._applyContext(instance);
    }

    // Framework factories (cached per request)
    if (this.frameworkHelpers.factories && Object.hasOwn(this.frameworkHelpers.factories, name)) {
      const factoryPath = this.frameworkHelpers.factories[name];
      const FactoryClass = require(globalThis.applicationPath(factoryPath));
      const factory = new FactoryClass();

      const instance = factory.createService(this.serviceManager);

      // cache per request
      this.instances[name] = instance;
      return this._applyContext(instance);
    }

    // Application factories (NOT cached by default)
    if (Object.hasOwn(this.applicationFactories, name)) {
      const factoryPath = this.applicationFactories[name];
      const FactoryClass = require(globalThis.applicationPath(factoryPath));
      const factory = new FactoryClass();

      const instance = factory.createService(this.serviceManager);
      return this._applyContext(instance);
    }

    // Application invokables (cached per request)
    if (Object.hasOwn(this.applicationHelpers, name)) {
      const helperConfig = this.applicationHelpers[name];
      const helperPath = typeof helperConfig === 'string' ? helperConfig : helperConfig.class;
      const HelperClass = require(globalThis.applicationPath(helperPath));
      const instance = new HelperClass();

      this.instances[name] = instance;
      return this._applyContext(instance);
    }

    throw new Error(`Helper '${name}' not found in ViewHelperManager`);
  }

  has(name) {
    return Object.hasOwn(this.frameworkHelpers.invokables, name) ||
      (this.frameworkHelpers.factories && Object.hasOwn(this.frameworkHelpers.factories, name)) ||
      Object.hasOwn(this.applicationHelpers, name) ||
      Object.hasOwn(this.applicationFactories, name);
  }

  getAvailableHelpers() {
    return [
      ...Object.keys(this.frameworkHelpers.invokables),
      ...(this.frameworkHelpers.factories ? Object.keys(this.frameworkHelpers.factories) : []),
      ...Object.keys(this.applicationHelpers),
      ...Object.keys(this.applicationFactories)
    ];
  }

  /**
   * Sync all cached stateful helpers to a ViewModel.
   * Bridges controller helper state → template Nunjucks context.
   * @param {ViewModel} viewModel
   */
  syncToViewModel(viewModel) {
    if (!viewModel || typeof viewModel.setVariable !== 'function') return;
    for (const instance of Object.values(this.instances)) {
      if (typeof instance.syncToViewModel === 'function') {
        instance.syncToViewModel(viewModel);
      }
    }
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