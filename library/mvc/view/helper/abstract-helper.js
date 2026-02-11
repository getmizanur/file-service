class AbstractHelper {

  constructor() {
    this.nunjucksContext = null;
  }

  /**
   * Extract Nunjucks context from arguments if present
   * The context is always passed as the last argument and is an object with ctx property
   * @param {Array} args - Arguments array
   * @returns {Array} Arguments with context removed
   */
  _extractContext(args) {
    if(args.length === 0) {
      return args;
    }

    const lastArg = args[args.length - 1];

    // Check if last argument is the Nunjucks context object
    // Nunjucks context has specific properties like ctx, env, etc.
    if(lastArg && typeof lastArg === 'object' &&
      (lastArg.ctx !== undefined || lastArg.env !== undefined || lastArg.getVariables !== undefined)) {
      this.nunjucksContext = lastArg;
      return args.slice(0, -1); // Remove context from args
    }

    return args;
  }

  /**
   * Get a template variable from the Nunjucks context
   * Variables from res.render() are at root level, not in ctx
   * @param {string} name - Variable name
   * @param {*} defaultValue - Default value if variable not found
   * @returns {*} Variable value or default
   */
  getVariable(name, defaultValue = null) {
    if(!this.nunjucksContext) {
      return defaultValue;
    }

    // First check root level (where res.render() variables are)
    if(this.nunjucksContext[name] !== undefined) {
      return this.nunjucksContext[name];
    }

    // Fall back to ctx (for nested context variables)
    if(this.nunjucksContext.ctx && this.nunjucksContext.ctx[name] !== undefined) {
      return this.nunjucksContext.ctx[name];
    }

    return defaultValue;
  }

  /**
   * Set a template variable in the Nunjucks context
   * Sets at root level to match how res.render() places variables
   * @param {string} name - Variable name
   * @param {*} value - Variable value
   */
  setVariable(name, value) {
    if(this.nunjucksContext) {
      // Set at root level (where res.render() variables are)
      this.nunjucksContext[name] = value;
    }
  }

  /**
   * Check if helper has access to Nunjucks context
   * @returns {boolean}
   */
  hasContext() {
    return this.nunjucksContext !== null;
  }

  /**
   * Set the Nunjucks context
   * @param {object} context - Nunjucks context object
   * @returns {AbstractHelper} For method chaining
   */
  setContext(context) {
    this.nunjucksContext = context;
    return this;
  }

  /**
   * Abstract render method that must be implemented by extending classes
   * @param {...any} args - Variable arguments passed to the render method
   * @throws {Error} If not implemented by extending class
   * @returns {string} Rendered output
   */
  render(...args) {
    throw new Error(`render() method must be implemented by ${this.constructor.name}`);
  }

}

module.exports = AbstractHelper;