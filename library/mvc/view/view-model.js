// library/mvc/view/view-model.js
class ViewModel {
  constructor() {
    this.variables = {};
    this.template = null;

    // Optional cache for helper instances (per ViewModel render)
    this.helpers = {};

    // Preferred: injected view helper manager (request-scoped)
    this.viewHelperManager = null;
  }

  getTemplate() {
    return this.template;
  }

  setTemplate(template) {
    this.template = template;
    return this;
  }

  getVariable(name, defaultValue = null) {
    if (this.variables && Object.prototype.hasOwnProperty.call(this.variables, name)) {
      return this.variables[name];
    }
    return defaultValue;
  }

  getVariables() {
    return this.variables;
  }

  setVariable(name, value) {
    this.variables[name] = value;
    return this;
  }

  setVariables(variables) {
    if (!variables || typeof variables !== 'object') return this;

    for (const key in variables) {
      if (!Object.prototype.hasOwnProperty.call(variables, key)) continue;
      this.setVariable(key, variables[key]);
    }

    return this;
  }

  clearVariables() {
    this.variables = {};
    return this;
  }

  /**
   * Inject ViewHelperManager (preferred).
   * This manager can apply nunjucks context per render and is request-scoped.
   */
  setViewHelperManager(viewHelperManager) {
    this.viewHelperManager = viewHelperManager;
    return this;
  }

  getViewHelperManager() {
    return this.viewHelperManager;
  }

  /**
   * Get a helper instance by name.
   *
   * Resolution order:
   * 1) ViewModel-local cache
   * 2) Injected ViewHelperManager (preferred)
   * 3) Nunjucks environment globals (legacy fallback)
   *
   * @param {string} name
   * @returns {object}
   */
  getHelper(name) {
    if (!name) {
      throw new Error('Helper name is required');
    }

    // 1) cache
    if (this.helpers[name]) {
      return this.helpers[name];
    }

    // 2) preferred: ViewHelperManager
    if (this.viewHelperManager && typeof this.viewHelperManager.get === 'function') {
      const helper = this.viewHelperManager.get(name);
      this.helpers[name] = helper;
      return helper;
    }

    // 3) legacy fallback: nunjucks globals
    if (global.nunjucksEnv && global.nunjucksEnv.globals && global.nunjucksEnv.globals[name]) {
      this.helpers[name] = global.nunjucksEnv.globals[name];
      return this.helpers[name];
    }

    throw new Error(`Helper '${name}' not found`);
  }

  /**
   * Set a helper instance explicitly.
   * @param {string} name
   * @param {object} helper
   */
  setHelper(name, helper) {
    this.helpers[name] = helper;
    return this;
  }

  /**
   * Clear cached helpers (useful between renders/tests)
   */
  clearHelpers() {
    this.helpers = {};
    return this;
  }
}

module.exports = ViewModel;