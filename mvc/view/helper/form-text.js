// library/mvc/view/helper/form-text.js
const AbstractHelper = require('./abstract-helper');

class FormText extends AbstractHelper {

  /**
   * Render a text input element
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
      let input = '<input ';

      const elementAttribs = (typeof element.getAttributes === 'function')
        ? (element.getAttributes() || {})
        : {};

      const attributes = Object.assign({}, elementAttribs, extraAttribs);

      // Ensure it's a text field if not specified
      if (!attributes.type) {
        attributes.type = 'text';
      }

      // Merge/dedupe class attribute
      if (attributes.class) {
        const classList = String(attributes.class).split(/\s+/).filter(Boolean);
        attributes.class = Array.from(new Set(classList)).join(' ');
      }

      for (const key in attributes) {
        if (!Object.prototype.hasOwnProperty.call(attributes, key)) continue;

        const val = attributes[key];

        // Skip null/undefined/false
        if (val === null || val === undefined || val === false) continue;

        // Boolean attributes (required, disabled, readonly, etc.)
        if (val === true) {
          input += `${key} `;
          continue;
        }

        input += `${key}="${this._escapeAttr(val)}" `;
      }

      input += '/>';
      return input;
    });
  }
}

module.exports = FormText;