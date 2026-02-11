const AbstractHelper = require('./abstract-helper');

class HeadMeta extends AbstractHelper {

  constructor() {
    super();
  }

  /**
   * Main render method - manages meta tags via Nunjucks context
   * Supports persistent meta tag building across template calls
   * @param {string|Object|null} nameOrProperty - Meta name/property attribute or options object
   * @param {string} content - Meta content value
   * @param {string} mode - 'add', 'set', 'render' (default: 'add')
   * @returns {string} Rendered meta tags or empty string if building
   */
  render(...args) {
    // Extract Nunjucks context from arguments
    const cleanArgs = this._extractContext(args);
    const [nameOrProperty = null, content = null, mode = 'add'] = cleanArgs;

    // Get stored meta tags from context or initialize
    let metaTags = this.getVariable('_headMetaTags', {});

    // No arguments - render all meta tags
    if(nameOrProperty === null && content === null) {
      return this._renderMetaTags(metaTags);
    }

    // If first argument is 'render', just render
    if(nameOrProperty === 'render') {
      return this._renderMetaTags(metaTags);
    }

    // Handle different modes
    switch(mode) {
      case 'set':
        // Clear existing and set new
        metaTags = {};
        this._addMetaTag(metaTags, nameOrProperty, content);
        break;
      case 'add':
        // Add to existing
        this._addMetaTag(metaTags, nameOrProperty, content);
        break;
      case 'render':
        // Just render without modifying
        return this._renderMetaTags(metaTags);
    }

    // Store updated meta tags back to context
    this.setVariable('_headMetaTags', metaTags);

    // Return empty string (building, not rendering)
    return '';
  }

  /**
   * Add a meta tag to the collection
   * @param {Object} metaTags - Meta tags collection
   * @param {string|Object} nameOrProperty - Meta name/property or options object
   * @param {string} content - Meta content value
   * @private
   */
  _addMetaTag(metaTags, nameOrProperty, content) {
    let key, attributes;

    if(typeof nameOrProperty === 'object') {
      // Object format: { name: 'description', content: '...' } or { property: 'og:title', content: '...' }
      attributes = nameOrProperty;
      key = attributes.name || attributes.property || attributes.charset || 'unknown';
    } else {
      // String format: headMeta('description', 'content value')
      attributes = {};

      // Detect if it's an Open Graph or Twitter Card property
      if(nameOrProperty && (nameOrProperty.startsWith('og:') || nameOrProperty.startsWith('twitter:'))) {
        attributes.property = nameOrProperty;
        key = nameOrProperty;
      } else if(nameOrProperty === 'charset') {
        attributes.charset = content;
        key = 'charset';
      } else {
        attributes.name = nameOrProperty;
        key = nameOrProperty;
      }

      if(content && key !== 'charset') {
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
    if(!metaTags || Object.keys(metaTags).length === 0) {
      return '';
    }

    const html = Object.values(metaTags).map(attributes => {
      let tag = '<meta';
      for(const [key, value] of Object.entries(attributes)) {
        if(value !== null && value !== undefined) {
          tag += ` ${key}="${this._escapeHtml(value)}"`;
        }
      }
      tag += '>';
      return tag;
    }).join('\n    ');

    return html;
  }

  /**
   * Escape HTML special characters
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   * @private
   */
  _escapeHtml(str) {
    const value = String(str);
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
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