// library/mvc/view/helper/abstract-helper.js
class AbstractHelper {

  constructor() {
    /**
     * NOTE:
     * Storing context on the instance can leak across renders if helpers are reused.
     * We keep this for backward compatibility, but provide safer APIs.
     */
    this.nunjucksContext = null;
  }

  /**
   * Detect whether an argument looks like a Nunjucks context.
   * Nunjucks context objects typically have one or more of:
   * - ctx (variables)
   * - env (environment)
   * - getVariables() (method)
   * @param {*} obj
   * @returns {boolean}
   */
  _isNunjucksContext(obj) {
    if (!obj || typeof obj !== 'object') return false;

    // Most reliable: ctx + env combination or getVariables function
    if (typeof obj.getVariables === 'function') return true;
    if (obj.env !== undefined && obj.ctx !== undefined) return true;

    // Looser fallback: allow ctx-only contexts
    if (obj.ctx !== undefined) return true;

    return false;
  }

  /**
   * Extract Nunjucks context from arguments if present.
   * Context is expected as the last argument by convention.
   * @param {Array} args - Arguments array
   * @returns {{ args: Array, context: object|null }}
   */
  _extractContext(args) {
    if (!Array.isArray(args) || args.length === 0) {
      return { args: Array.isArray(args) ? args : [], context: null };
    }

    const lastArg = args[args.length - 1];

    if (this._isNunjucksContext(lastArg)) {
      return { args: args.slice(0, -1), context: lastArg };
    }

    return { args, context: null };
  }

  /**
   * Get a template variable from the Nunjucks context.
   * Variables from res.render() are commonly at root level, not in ctx.
   * @param {string} name
   * @param {*} defaultValue
   * @param {object|null} [contextOverride]
   * @returns {*}
   */
  getVariable(name, defaultValue = null, contextOverride = null) {
    const ctxObj = contextOverride || this.nunjucksContext;
    if (!ctxObj) return defaultValue;

    // Root level (res.render variables)
    if (ctxObj[name] !== undefined) return ctxObj[name];

    // Nunjucks ctx (nested)
    if (ctxObj.ctx && ctxObj.ctx[name] !== undefined) return ctxObj.ctx[name];

    return defaultValue;
  }

  /**
   * Set a template variable in the Nunjucks context.
   * Sets at root level to match how res.render() places variables.
   * @param {string} name
   * @param {*} value
   * @param {object|null} [contextOverride]
   */
  setVariable(name, value, contextOverride = null) {
    const ctxObj = contextOverride || this.nunjucksContext;
    if (ctxObj) {
      ctxObj[name] = value;
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
   * Explicitly set the Nunjucks context (legacy supported)
   * @param {object} context
   * @returns {AbstractHelper}
   */
  setContext(context) {
    this.nunjucksContext = context;
    return this;
  }

  /**
   * Clear context (useful for safety when instances are reused)
   * @returns {AbstractHelper}
   */
  clearContext() {
    this.nunjucksContext = null;
    return this;
  }

  /**
   * Run a function with a temporary context without leaking it.
   * @param {object} context
   * @param {Function} fn
   * @returns {*}
   */
  withContext(context, fn) {
    const prev = this.nunjucksContext;
    this.nunjucksContext = context;

    try {
      return fn();
    } finally {
      // restore previous context (or null)
      this.nunjucksContext = prev;
    }
  }

  /**
   * Escape HTML special characters for safe output.
   * @param {*} value
   * @returns {string}
   */
  _escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Escape attribute values safely (delegates to _escapeHtml).
   * @param {*} value
   * @returns {string}
   */
  _escapeAttr(value) {
    return this._escapeHtml(value);
  }

  /**
   * Abstract render method that must be implemented by extending classes.
   * Tip for subclasses:
   *   const { args, context } = this._extractContext([...arguments]);
   *   return this.withContext(context, () => { ...render using args... });
   *
   * @throws {Error} If not implemented by extending class
   * @returns {string}
   */
  render(..._args) {
    throw new Error(`render() method must be implemented by ${this.constructor.name}`);
  }
}

module.exports = AbstractHelper;