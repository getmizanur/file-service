// library/mvc/view/helper/form-textarea.js
const AbstractHelper = require('./abstract-helper');

class FormTextarea extends AbstractHelper {

  /**
   * Render a textarea element
   * @param {Element} element - The form element
   * @param {Object} extraAttribs - Optional extra attributes (e.g. { class: '...' })
   * @returns {string}
   */
  render(...args) {
    const { args: cleanArgs, context } = this._extractContext(args);
    const [element, extraAttribs = {}] = cleanArgs;

    if (!element) {
      return '';
    }

    return this.withContext(context, () => {
      let textarea = '<textarea ';

      const elementAttribs = (typeof element.getAttributes === 'function')
        ? (element.getAttributes() || {})
        : {};

      const attributes = Object.assign({}, elementAttribs, extraAttribs);

      // 'type' is not valid for textarea
      if (Object.prototype.hasOwnProperty.call(attributes, 'type')) {
        delete attributes.type;
      }

      // Text content: prefer element.getValue(), then getTextContent()
      const textContent =
        (typeof element.getValue === 'function' && element.getValue() != null)
          ? element.getValue()
          : (typeof element.getTextContent === 'function' ? (element.getTextContent() || '') : '');

      // 'value' isn't a valid attribute for textarea content
      if (Object.prototype.hasOwnProperty.call(attributes, 'value')) {
        delete attributes.value;
      }

      // Merge/dedupe class attribute
      if (attributes.class) {
        const classList = String(attributes.class).split(/\s+/).filter(Boolean);
        attributes.class = Array.from(new Set(classList)).join(' ');
      }

      // Build attributes string (handle boolean attrs too)
      for (const key in attributes) {
        if (!Object.prototype.hasOwnProperty.call(attributes, key)) continue;

        const val = attributes[key];

        // Skip null/undefined/false
        if (val === null || val === undefined || val === false) continue;

        // Boolean attributes
        if (val === true) {
          textarea += `${key} `;
          continue;
        }

        textarea += `${key}="${this._escapeAttr(val)}" `;
      }

      textarea += '>';
      textarea += this._escapeHtml(textContent);
      textarea += '</textarea>';

      return textarea;
    });
  }
}

module.exports = FormTextarea;