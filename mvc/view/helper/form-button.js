// library/mvc/view/helper/form-button.js
const AbstractHelper = require('./abstract-helper');

class FormButton extends AbstractHelper {

  render(...args) {
    const { args: cleanArgs, context } = this._extractContext(args);
    const [element] = cleanArgs;

    if (element === undefined || element === null) {
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

        // Skip null/undefined/false boolean-ish attributes
        if (val === null || val === undefined || val === false) continue;

        // Boolean attributes (e.g., disabled, required)
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

module.exports = FormButton;
