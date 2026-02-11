const AbstractHelper = require('./abstract-helper');

class HeadLink extends AbstractHelper {

  constructor() {
    super();
  }

  /**
   * Main render method - manages link tags via Nunjucks context
   * Supports persistent link tag building across template calls
   * @param {Object|null} attributes - Link attributes object { rel: 'stylesheet', href: '...' }
   * @param {string} mode - 'add', 'set', 'render' (default: 'add')
   * @returns {string} Rendered link tags or empty string if building
   */
  render(...args) {
    // Extract Nunjucks context from arguments
    const cleanArgs = this._extractContext(args);
    const [attributes = null, mode = 'add'] = cleanArgs;

    // Get stored link tags from context or initialize
    let linkTags = this.getVariable('_headLinkTags', []);

    // No arguments - render all link tags
    if(attributes === null) {
      return this._renderLinkTags(linkTags);
    }

    // If first argument is 'render', just render
    if(attributes === 'render') {
      return this._renderLinkTags(linkTags);
    }

    // Handle different modes
    switch(mode) {
      case 'set':
        // Clear existing and set new
        linkTags = [];
        this._addLinkTag(linkTags, attributes);
        break;
      case 'add':
        // Add to existing
        this._addLinkTag(linkTags, attributes);
        break;
      case 'render':
        // Just render without modifying
        return this._renderLinkTags(linkTags);
    }

    // Store updated link tags back to context
    this.setVariable('_headLinkTags', linkTags);

    // Return empty string (building, not rendering)
    return '';
  }

  /**
   * Add a link tag to the collection
   * @param {Array} linkTags - Link tags collection
   * @param {Object} attributes - Link attributes
   * @private
   */
  _addLinkTag(linkTags, attributes) {
    if(typeof attributes !== 'object' || attributes === null) {
      return;
    }

    // Create a unique key for deduplication based on rel and href
    const key = `${attributes.rel || 'link'}-${attributes.href || ''}`;

    // Check if link with same key already exists (avoid duplicates)
    const existingIndex = linkTags.findIndex(link => {
      const linkKey = `${link.rel || 'link'}-${link.href || ''}`;
      return linkKey === key;
    });

    if(existingIndex !== -1) {
      // Update existing link
      linkTags[existingIndex] = {
        ...linkTags[existingIndex],
        ...attributes
      };
    } else {
      // Add new link
      linkTags.push(attributes);
    }
  }

  /**
   * Render all link tags to HTML
   * @param {Array} linkTags - Link tags collection
   * @returns {string} HTML link tags
   * @private
   */
  _renderLinkTags(linkTags) {
    if(!linkTags || linkTags.length === 0) {
      return '';
    }

    const html = linkTags.map(attributes => {
      let tag = '<link';
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
   * Clear all link tags
   * @returns {HeadLink} For method chaining
   */
  clear() {
    this.setVariable('_headLinkTags', []);
    return this;
  }

  /**
   * Helper method to add a stylesheet
   * @param {string} href - Stylesheet URL
   * @param {Object} extraAttribs - Additional attributes
   * @returns {string} Empty string (for chaining in templates)
   */
  stylesheet(href, extraAttribs = {}) {
    const attributes = {
      rel: 'stylesheet',
      href: href,
      ...extraAttribs
    };
    return this.render(attributes, 'add');
  }

  /**
   * Helper method to add a favicon
   * @param {string} href - Favicon URL
   * @param {string} type - MIME type (default: 'image/x-icon')
   * @returns {string} Empty string (for chaining in templates)
   */
  favicon(href, type = 'image/x-icon') {
    const attributes = {
      rel: 'icon',
      type: type,
      href: href
    };
    return this.render(attributes, 'add');
  }

  /**
   * Helper method to add a canonical link
   * @param {string} href - Canonical URL
   * @returns {string} Empty string (for chaining in templates)
   */
  canonical(href) {
    const attributes = {
      rel: 'canonical',
      href: href
    };
    return this.render(attributes, 'add');
  }

}

module.exports = HeadLink;