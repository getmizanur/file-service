class ViewModel {
  constructor() {
    this.variables = {};
    this.template = null;
    this.helpers = {};
  }

  getTemplate() {
    return this.template;
  }

  setTemplate(template) {
    this.template = template;

    return this;
  }

  getVariable(name, defaultValue = null) {
    if(this.variables && this.variables.hasOwnProperty(name)) {
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
    for(let key in variables) {
      this.setVariable(key, variables[key]);
    }

    return this;
  }

  clearVariables() {
    this.variables = {};
  }

  /**
   * Get a helper instance by name
   * Helpers are retrieved from ServiceManager which creates ViewHelperManager
   * Structure: global.nunjucksEnv.globals.__framework.ViewHelperManager.configs
   * @param {string} name - Helper name
   * @returns {object} Helper instance
   */
  getHelper(name) {
    // Check if helper is already cached
    if(this.helpers[name]) {
      return this.helpers[name];
    }

    // Try to get helper from nunjucks environment globals (registered in bootstrap)
    if(global.nunjucksEnv && global.nunjucksEnv.globals[name]) {
      this.helpers[name] = global.nunjucksEnv.globals[name];
      return this.helpers[name];
    }

    throw new Error(`Helper '${name}' not found`);
  }

  /**
   * Set a helper instance
   * @param {string} name - Helper name
   * @param {object} helper - Helper instance
   * @returns {ViewModel} For method chaining
   */
  setHelper(name, helper) {
    this.helpers[name] = helper;
    return this;
  }
}

module.exports = ViewModel