const AbstractHelper = require('./abstract-helper');

class FormCheckbox extends AbstractHelper {
  /**
   * Render a checkbox input element
   * @param {Element} element - The form element
   * @param {Object} extraAttribs - Optional extra attributes (e.g. { class: '...' })
   * @returns {string}
   */
  render(...args) {
    const cleanArgs = this._extractContext(args);
    const [element, extraAttribs = {}] = cleanArgs;

    if(element == undefined) {
      return '';
    }

    let html = '';
    let attributes = Object.assign({}, element.getAttributes(), extraAttribs);

    // Handle class attribute - merge and deduplicate
    let classList = [];
    if(attributes.class) {
      classList = attributes.class.split(' ');
      // Remove duplicate classes
      attributes.class = Array.from(new Set(classList)).join(' ');
    }

    // Add hidden input for unchecked value if available
    const uncheckedValue = element.getUncheckedValue?.();
    if(uncheckedValue !== undefined && uncheckedValue !== null) {
      html += '<input type="hidden" ';
      html += 'name="' + this.escapeHtml(attributes.name) + '" ';
      html += 'value="' + this.escapeHtml(uncheckedValue) + '" />';
    }

    // Build checkbox input
    html += '<input ';

    for(let key in attributes) {
      if(attributes[key] !== undefined && attributes[key] !== null) {
        html += key + '="' + this.escapeHtml(attributes[key]) + '" ';
      }
    }

    html += '/>';

    return html;
  }

  /**
   * Escape HTML special characters to prevent XSS
   * @param {string} text
   * @returns {string}
   */
  escapeHtml(text) {
    if(text === null || text === undefined) return '';

    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };

    return text.toString().replace(/[&<>"']/g, (m) => map[m]);
  }
}

module.exports = FormCheckbox;