const AbstractHelper = require('./abstract-helper');

/**
 * EscapeHtml Helper for Views
 * Escapes HTML special characters to prevent XSS attacks
 */
class EscapeHtml extends AbstractHelper {

  /**
   * Escape HTML special characters
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escape(str) {
    if (str === null || str === undefined) {
      return '';
    }

    // Convert to string if not already
    str = String(str);

    const htmlEscapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };

    return str.replace(/[&<>"'\/]/g, (match) => htmlEscapeMap[match]);
  }

  /**
   * Main render method that can be called from templates
   * Accepts (value, context) where context is optionally passed as last arg by Nunjucks.
   * @returns {string}
   */
  render(...args) {
    const { args: cleanArgs, context } = this._extractContext(args);
    const str = cleanArgs[0];

    return this.withContext(context, () => this.escape(str));
  }
}

module.exports = EscapeHtml;