const AbstractHelper = require('./abstract-helper');

class FormCsrf extends AbstractHelper {

  /**
   * Render CSRF hidden input field
   * @param {Element} element - Csrf element instance
   * @returns {string} HTML for hidden CSRF input
   */
  render(...args) {
    const { args: cleanArgs, context } = this._extractContext(args);
    const [element] = cleanArgs;

    if (!element) return '';

    return this.withContext(context, () => {
      let input = '<input ';

      const attributes = (typeof element.getAttributes === 'function')
        ? (element.getAttributes() || {})
        : {};

      for (const key in attributes) {
        if (!Object.prototype.hasOwnProperty.call(attributes, key)) continue;

        const val = attributes[key];

        // Skip null/undefined/false
        if (val === null || val === undefined || val === false) continue;

        // Boolean attributes (rare on hidden input, but safe)
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

module.exports = FormCsrf;