// library/mvc/view/helper/head-link.js
const AbstractHelper = require('./abstract-helper');

class HeadLink extends AbstractHelper {

  constructor() {
    super();
  }

  /**
   * Main render method - manages link tags via Nunjucks context
   * Supports persistent link tag building across template calls
   *
   * Usage patterns:
   *  - {{ headLink({rel:'stylesheet', href:'/a.css'}) }}           // add
   *  - {{ headLink({rel:'stylesheet', href:'/a.css'}, 'set') }}    // replace
   *  - {{ headLink('render') }} or {{ headLink(null) }}            // render all
   *
   * @param {Object|string|null} attributes - Link attributes object OR 'render' sentinel
   * @param {string} mode - 'add' | 'set' | 'render' (default: 'add')
   * @returns {string} Rendered link tags or empty string if building
   */
  render(...args) {
    const { args: cleanArgs, context } = this._extractContext(args);
    const [attributes = null, mode = 'add'] = cleanArgs;

    return this.withContext(context, () => {
      // Get stored link tags from context or initialize
      let linkTags = this.getVariable('_headLinkTags', []);
      if (!Array.isArray(linkTags)) linkTags = [];

      // No arguments OR explicit render sentinel => render all link tags
      if (attributes === null || attributes === 'render') {
        return this._renderLinkTags(linkTags);
      }

      // Handle different modes
      switch (mode) {
        case 'set':
          linkTags = [];
          this._addLinkTag(linkTags, attributes);
          break;

        case 'add':
          this._addLinkTag(linkTags, attributes);
          break;

        case 'render':
          return this._renderLinkTags(linkTags);

        default:
          // unknown mode: default to add
          this._addLinkTag(linkTags, attributes);
          break;
      }

      // Store updated link tags back to context
      this.setVariable('_headLinkTags', linkTags);

      // Return empty string (building, not rendering)
      return '';
    });
  }

  /**
   * Add a link tag to the collection
   * @param {Array} linkTags
   * @param {Object} attributes
   * @private
   */
  _addLinkTag(linkTags, attributes) {
    if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
      return;
    }

    // Create a unique key for deduplication based on rel and href
    const key = `${attributes.rel || 'link'}-${attributes.href || ''}`;

    const existingIndex = linkTags.findIndex(link => {
      const linkKey = `${(link && link.rel) || 'link'}-${(link && link.href) || ''}`;
      return linkKey === key;
    });

    if (existingIndex !== -1) {
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
   * @param {Array} linkTags
   * @returns {string}
   * @private
   */
  _renderLinkTags(linkTags) {
    if (!Array.isArray(linkTags) || linkTags.length === 0) {
      return '';
    }

    return linkTags
      .map(attributes => {
        if (!attributes || typeof attributes !== 'object') return '';

        let tag = '<link';
        for (const [key, value] of Object.entries(attributes)) {
          if (value === null || value === undefined || value === false) continue;

          // Boolean attributes (rare for <link>, but safe)
          if (value === true) {
            tag += ` ${key}`;
            continue;
          }

          tag += ` ${key}="${this._escapeAttr(value)}"`;
        }
        tag += '>';
        return tag;
      })
      .filter(Boolean)
      .join('\n    ');
  }

  /**
   * Clear all link tags
   * @returns {HeadLink}
   */
  clear() {
    this.setVariable('_headLinkTags', []);
    return this;
  }

  /**
   * Helper method to add a stylesheet
   */
  stylesheet(href, extraAttribs = {}) {
    const attributes = {
      rel: 'stylesheet',
      href,
      ...extraAttribs
    };
    return this.render(attributes, 'add');
  }

  /**
   * Helper method to add a favicon
   */
  favicon(href, type = 'image/x-icon') {
    const attributes = {
      rel: 'icon',
      type,
      href
    };
    return this.render(attributes, 'add');
  }

  /**
   * Helper method to add a canonical link
   */
  canonical(href) {
    const attributes = {
      rel: 'canonical',
      href
    };
    return this.render(attributes, 'add');
  }
}

module.exports = HeadLink;