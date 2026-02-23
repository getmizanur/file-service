// library/mvc/view/helper/form-error.js
const Element = require('../../../form/element');
const AbstractHelper = require('./abstract-helper');

class FormError extends AbstractHelper {

  render(...args) {
    const { args: cleanArgs, context } = this._extractContext(args);
    const [element, attributes = {}] = cleanArgs;

    if (!(element instanceof Element)) {
      throw new Error('Value is not an instance of Element');
    }

    return this.withContext(context, () => {
      const messages = element.getMessages() || [];
      if (!Array.isArray(messages) || messages.length === 0) {
        return '';
      }

      let markup = this.messageOpenFormat(attributes);

      for (const msg of messages) {
        // escape message content to prevent XSS
        markup += '<li>' + this._escapeHtml(msg) + '</li>';
      }

      markup += this.messageCloseString();
      return markup;
    });
  }

  messageOpenFormat(attributes) {
    let markup = '<ul class="dp-error-message"';

    if (attributes && typeof attributes === 'object') {
      for (const key in attributes) {
        if (!Object.prototype.hasOwnProperty.call(attributes, key)) continue;

        const val = attributes[key];

        // Skip null/undefined/false attrs
        if (val === null || val === undefined || val === false) continue;

        // Boolean attributes
        if (val === true) {
          markup += ' ' + key;
          continue;
        }

        markup += ' ' + key + '="' + this._escapeAttr(val) + '"';
      }
    }

    markup += '>';
    return markup;
  }

  messageCloseString() {
    return '</ul>';
  }

  // Kept for API compatibility (not used by current render())
  messageSeparatorString() {
    return '</li><li>';
  }
}

module.exports = FormError;