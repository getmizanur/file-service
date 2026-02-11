const AbstractHelper = require('./abstract-helper');

class FormTextarea extends AbstractHelper {
  /**
   * Render a textarea element
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

    let textarea = '<textarea ';
    let attributes = Object.assign({}, element.getAttributes(), extraAttribs);

    // Remove 'type' attribute as it's not valid for textarea
    delete attributes.type;

    // Extract value/content separately
    const textContent = element.getValue() || element.getTextContent?.() || '';
    delete attributes.value;

    // Handle class attribute - merge and deduplicate
    let classList = [];
    if(attributes.class) {
      classList = attributes.class.split(' ');
      // Remove duplicate classes
      attributes.class = Array.from(new Set(classList)).join(' ');
    }

    // Build attributes string
    for(let key in attributes) {
      if(attributes[key] !== undefined && attributes[key] !== null) {
        textarea += key + '="' + attributes[key] + '" ';
      }
    }

    textarea += '>';
    textarea += this.escapeHtml(textContent);
    textarea += '</textarea>';

    return textarea;
  }

  /**
   * Escape HTML special characters to prevent XSS
   * @param {string} text
   * @returns {string}
   */
  escapeHtml(text) {
    if(!text) return '';

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

module.exports = FormTextarea;