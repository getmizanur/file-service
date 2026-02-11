const AbstractHelper = require('./abstract-helper');

class HeadScript extends AbstractHelper {

  constructor() {
    super();
  }

  /**
   * Main render method - can be called with various parameters
   * Supports persistent script building via Nunjucks context
   * @param {string|object|null} scriptOrAttributes - Script source URL or attributes object
   * @param {string} mode - 'append', 'prepend', or 'render' (default: 'append')
   * @param {object} attributes - Additional attributes (type, async, defer, etc.)
   * @returns {string} Rendered script tags or empty string if setting for later
   */
  render(...args) {
    // Extract Nunjucks context from arguments
    const cleanArgs = this._extractContext(args);
    const [scriptOrAttributes = null, mode = 'append', attributes = {}] = cleanArgs;

    // Get stored scripts from context or initialize
    let scripts = this.getVariable('_headScriptParts', []);

    // If no arguments, render what we have
    if(scriptOrAttributes === null) {
      return this._renderScripts(scripts);
    }

    // Handle render-only mode
    if(mode === 'render') {
      return this._renderScripts(scripts);
    }

    // Normalize input to script object
    let scriptObj;
    if(typeof scriptOrAttributes === 'string') {
      // Simple src string
      scriptObj = {
        src: scriptOrAttributes,
        ...attributes
      };
    } else if(typeof scriptOrAttributes === 'object') {
      // Already an object with attributes
      scriptObj = {
        ...scriptOrAttributes
      };
    } else {
      return '';
    }

    // Handle different modes
    switch(mode) {
      case 'append':
        scripts.push(scriptObj);
        break;
      case 'prepend':
        scripts.unshift(scriptObj);
        break;
      case 'set':
        scripts = [scriptObj];
        break;
    }

    // Store updated scripts back to context
    this.setVariable('_headScriptParts', scripts);

    // For append/prepend/set, return empty string (they're building, not rendering)
    return '';
  }

  /**
   * Render scripts array to HTML script tags
   * @param {Array} scripts - Array of script objects
   * @returns {string}
   */
  _renderScripts(scripts) {
    if(!scripts || scripts.length === 0) {
      return '';
    }

    return scripts.map(script => this._renderScriptTag(script)).join('\n    ');
  }

  /**
   * Render single script tag
   * @param {object} script - Script attributes object
   * @returns {string}
   */
  _renderScriptTag(script) {
    const attrs = [];

    // Handle src
    if(script.src) {
      attrs.push(`src="${this._escapeAttr(script.src)}"`);
    }

    // Handle type (default to text/javascript if not specified)
    const type = script.type || 'text/javascript';
    if(type) {
      attrs.push(`type="${this._escapeAttr(type)}"`);
    }

    // Handle async
    if(script.async === true || script.async === 'async') {
      attrs.push('async');
    }

    // Handle defer
    if(script.defer === true || script.defer === 'defer') {
      attrs.push('defer');
    }

    // Handle integrity
    if(script.integrity) {
      attrs.push(`integrity="${this._escapeAttr(script.integrity)}"`);
    }

    // Handle crossorigin
    if(script.crossorigin) {
      attrs.push(`crossorigin="${this._escapeAttr(script.crossorigin)}"`);
    }

    // Handle referrerpolicy
    if(script.referrerpolicy) {
      attrs.push(`referrerpolicy="${this._escapeAttr(script.referrerpolicy)}"`);
    }

    // Handle nonce
    if(script.nonce) {
      attrs.push(`nonce="${this._escapeAttr(script.nonce)}"`);
    }

    // Handle inline script content
    if(script.content) {
      return `<script ${attrs.join(' ')}>\n${script.content}\n</script>`;
    }

    return `<script ${attrs.join(' ')}></script>`;
  }

  /**
   * Escape attribute value for safe HTML output
   * @param {string} value - Attribute value
   * @returns {string}
   */
  _escapeAttr(value) {
    if(!value) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Append a script to the end
   * @param {string|object} scriptOrAttributes - Script src or attributes object
   * @param {object} attributes - Additional attributes
   * @returns {HeadScript} For method chaining
   */
  append(scriptOrAttributes, attributes = {}) {
    this.render(scriptOrAttributes, 'append', attributes);
    return this;
  }

  /**
   * Prepend a script to the beginning
   * @param {string|object} scriptOrAttributes - Script src or attributes object
   * @param {object} attributes - Additional attributes
   * @returns {HeadScript} For method chaining
   */
  prepend(scriptOrAttributes, attributes = {}) {
    this.render(scriptOrAttributes, 'prepend', attributes);
    return this;
  }

  /**
   * Clear all scripts
   * @returns {HeadScript} For method chaining
   */
  clear() {
    this.setVariable('_headScriptParts', []);
    return this;
  }

  /**
   * Check if scripts are empty
   * @returns {boolean} True if no scripts set
   */
  isEmpty() {
    const scripts = this.getVariable('_headScriptParts', []);
    return scripts.length === 0;
  }

  /**
   * Convert to string representation
   * @returns {string} Formatted script tags
   */
  toString() {
    const scripts = this.getVariable('_headScriptParts', []);
    return this._renderScripts(scripts);
  }

}

module.exports = HeadScript;