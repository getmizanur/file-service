// library/mvc/view/helper/form-hidden.js
const AbstractHelper = require('./abstract-helper');

class FormHidden extends AbstractHelper {

  render(...args) {
    const { args: cleanArgs, context } = this._extractContext(args);
    const [element] = cleanArgs;

    if (!element) {
      return '';
    }

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

        // Boolean attributes
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

module.exports = FormHidden;
