// library/mvc/view/helper/head-meta.js
const AbstractHelper = require('./abstract-helper');

class HeadMeta extends AbstractHelper {

  constructor() {
    super();
  }

  /**
   * Main render method - manages meta tags via Nunjucks context
   * Supports persistent meta tag building across template calls
   * @param {string|Object|null} nameOrProperty - Meta name/property attribute or options object
   * @param {string|null} content - Meta content value
   * @param {string} mode - 'add', 'set', 'render' (default: 'add')
   * @returns {string} Rendered meta tags or empty string if building
   */
  render(...args) {
    const { args: cleanArgs, context } = this._extractContext(args);
    const [nameOrProperty = null, content = null, mode = 'add'] = cleanArgs;

    return this.withContext(context, () => {
      // Get stored meta tags from context or initialize
      let metaTags = this.getVariable('_headMetaTags', {});
      if (!metaTags || typeof metaTags !== 'object' || Array.isArray(metaTags)) {
        metaTags = {};
      }

      // No arguments - render all meta tags
      if (nameOrProperty === null && content === null) {
        return this._renderMetaTags(metaTags);
      }

      // If first argument is 'render', just render
      if (nameOrProperty === 'render') {
        return this._renderMetaTags(metaTags);
      }

      // Handle different modes
      switch (mode) {
        case 'set':
          metaTags = {};
          this._addMetaTag(metaTags, nameOrProperty, content);
          break;

        case 'add':
          this._addMetaTag(metaTags, nameOrProperty, content);
          break;

        case 'render':
          return this._renderMetaTags(metaTags);

        default:
          // Unknown mode -> treat as add
          this._addMetaTag(metaTags, nameOrProperty, content);
          break;
      }

      // Store updated meta tags back to context
      this.setVariable('_headMetaTags', metaTags);

      // Return empty string (building, not rendering)
      return '';
    });
  }

  /**
   * Add a meta tag to the collection
   * @param {Object} metaTags - Meta tags collection
   * @param {string|Object} nameOrProperty - Meta name/property or options object
   * @param {string|null} content - Meta content value
   * @private
   */
  _addMetaTag(metaTags, nameOrProperty, content) {
    let key, attributes;

    if (nameOrProperty && typeof nameOrProperty === 'object' && !Array.isArray(nameOrProperty)) {
      // Object format: { name: 'description', content: '...' } or { property: 'og:title', content: '...' }
      attributes = nameOrProperty;
      key = attributes.name || attributes.property || attributes.charset || 'unknown';
    } else {
      // String format: headMeta('description', 'content value')
      attributes = {};

      if (nameOrProperty && (String(nameOrProperty).startsWith('og:') || String(nameOrProperty).startsWith('twitter:'))) {
        attributes.property = nameOrProperty;
        key = nameOrProperty;
      } else if (nameOrProperty === 'charset') {
        attributes.charset = content;
        key = 'charset';
      } else {
        attributes.name = nameOrProperty;
        key = nameOrProperty;
      }

      if (content !== null && content !== undefined && key !== 'charset') {
        attributes.content = content;
      }
    }

    // Store using key (allows overwriting same meta tag)
    metaTags[key] = attributes;
  }

  /**
   * Render all meta tags to HTML
   * @param {Object} metaTags - Meta tags collection
   * @returns {string} HTML meta tags
   * @private
   */
  _renderMetaTags(metaTags) {
    if (!metaTags || typeof metaTags !== 'object' || Object.keys(metaTags).length === 0) {
      return '';
    }

    return Object.values(metaTags).map(attributes => {
      if (!attributes || typeof attributes !== 'object') return '';

      let tag = '<meta';
      for (const [key, value] of Object.entries(attributes)) {
        if (value === null || value === undefined || value === false) continue;

        // Boolean attributes (rare for meta, but safe)
        if (value === true) {
          tag += ` ${key}`;
          continue;
        }

        tag += ` ${key}="${this._escapeHtml(value)}"`;
      }
      tag += '>';
      return tag;
    }).filter(Boolean).join('\n    ');
  }

  /**
   * Clear all meta tags
   * @returns {HeadMeta} For method chaining
   */
  clear() {
    this.setVariable('_headMetaTags', {});
    return this;
  }
}

module.exports = HeadMeta;