const AbstractHelper = require('./abstract-helper');

class HeadScript extends AbstractHelper {

  constructor() {
    super();
  }

  /**
   * Main render method - can be called with various parameters
   * Supports persistent script building via Nunjucks context
   *
   * Examples:
   *  - {{ headScript() }}                         -> render all
   *  - {{ headScript('render') }}                 -> render all
   *  - {{ headScript('/a.js') }}                  -> append
   *  - {{ headScript('/a.js', 'prepend') }}       -> prepend
   *  - {{ headScript('/a.js', 'append', {defer:true}) }}
   *  - {{ headScript({src:'/a.js', defer:true}) }}
   *
   * @param {string|object|null} scriptOrAttributes - Script source URL or attributes object OR 'render'
   * @param {string} mode - 'append', 'prepend', 'set', 'render' (default: 'append')
   * @param {object} attributes - Additional attributes (type, async, defer, etc.)
   * @returns {string} Rendered script tags or empty string if setting for later
   */
  render(...args) {
    const { args: cleanArgs, context } = this._extractContext(args);
    const [scriptOrAttributes = null, mode = 'append', attributes = {}] = cleanArgs;

    return this.withContext(context, () => {
      // Get stored scripts from context or initialize
      let scripts = this.getVariable('_headScriptParts', []);
      if (!Array.isArray(scripts)) scripts = [];

      // Render if no args or explicit render sentinel
      if (scriptOrAttributes === null || scriptOrAttributes === 'render' || mode === 'render') {
        return this._renderScripts(scripts);
      }

      // Normalize input to script object
      let scriptObj;
      if (typeof scriptOrAttributes === 'string') {
        scriptObj = {
          src: scriptOrAttributes,
          ...(attributes && typeof attributes === 'object' ? attributes : {})
        };
      } else if (scriptOrAttributes && typeof scriptOrAttributes === 'object' && !Array.isArray(scriptOrAttributes)) {
        scriptObj = { ...scriptOrAttributes };
      } else {
        return '';
      }

      // Handle different modes
      switch (mode) {
        case 'prepend':
          scripts.unshift(scriptObj);
          break;

        case 'set':
          scripts = [scriptObj];
          break;

        case 'append':
        default:
          scripts.push(scriptObj);
          break;
      }

      // Store updated scripts back to context
      this.setVariable('_headScriptParts', scripts);

      // For append/prepend/set, return empty string (building, not rendering)
      return '';
    });
  }

  /**
   * Render scripts array to HTML script tags
   * @param {Array} scripts
   * @returns {string}
   */
  _renderScripts(scripts) {
    if (!Array.isArray(scripts) || scripts.length === 0) {
      return '';
    }

    return scripts.map(script => this._renderScriptTag(script)).join('\n    ');
  }

  /**
   * Render single script tag
   * @param {object} script
   * @returns {string}
   */
  _renderScriptTag(script) {
    if (!script || typeof script !== 'object') {
      return '';
    }

    const attrs = [];

    // src
    if (script.src) {
      attrs.push(`src="${this._escapeAttr(script.src)}"`);
    }

    // type (default)
    const type = script.type || 'text/javascript';
    if (type) {
      attrs.push(`type="${this._escapeAttr(type)}"`);
    }

    // async
    if (script.async === true || script.async === 'async') {
      attrs.push('async');
    }

    // defer
    if (script.defer === true || script.defer === 'defer') {
      attrs.push('defer');
    }

    // integrity
    if (script.integrity) {
      attrs.push(`integrity="${this._escapeAttr(script.integrity)}"`);
    }

    // crossorigin
    if (script.crossorigin) {
      attrs.push(`crossorigin="${this._escapeAttr(script.crossorigin)}"`);
    }

    // referrerpolicy
    if (script.referrerpolicy) {
      attrs.push(`referrerpolicy="${this._escapeAttr(script.referrerpolicy)}"`);
    }

    // nonce
    if (script.nonce) {
      attrs.push(`nonce="${this._escapeAttr(script.nonce)}"`);
    }

    // Render inline content if provided
    if (script.content !== undefined && script.content !== null) {
      // Inline script content should be treated as trusted template content.
      // We only coerce to string here (no escaping), because escaping would break JS.
      const content = String(script.content);
      return `<script ${attrs.join(' ')}>\n${content}\n</script>`;
    }

    return `<script ${attrs.join(' ')}></script>`;
  }

  append(scriptOrAttributes, attributes = {}) {
    this.render(scriptOrAttributes, 'append', attributes);
    return this;
  }

  prepend(scriptOrAttributes, attributes = {}) {
    this.render(scriptOrAttributes, 'prepend', attributes);
    return this;
  }

  clear() {
    this.setVariable('_headScriptParts', []);
    return this;
  }

  isEmpty() {
    const scripts = this.getVariable('_headScriptParts', []);
    return !Array.isArray(scripts) || scripts.length === 0;
  }

  toString() {
    const scripts = this.getVariable('_headScriptParts', []);
    return this._renderScripts(scripts);
  }
}

module.exports = HeadScript;