// library/mvc/view/helper/form-submit.js
const AbstractHelper = require('./abstract-helper');

class FormSubmit extends AbstractHelper {

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

      // Ensure dp-button class is present
      const existingClass = attributes.class ? String(attributes.class) : '';
      const classList = existingClass.split(/\s+/).filter(Boolean);
      if (!classList.includes('dp-button')) classList.push('dp-button');
      attributes.class = classList.join(' ');

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

module.exports = FormSubmit;