const AbstractHelper = require('./abstract-helper');

class FormCsrf extends AbstractHelper {
  /**
   * Render CSRF hidden input field
   * @param {Element} element - Csrf element instance
   * @returns {string} HTML for hidden CSRF input
   */
  render(...args) {
    const cleanArgs = this._extractContext(args);
    const [element] = cleanArgs;

    if(!element) return '';
    let input = '<input ';
    const attributes = element.getAttributes();
    for(const key in attributes) {
      input += key + '="' + attributes[key] + '" ';
    }
    input += '/>';
    return input;
  }
}

module.exports = FormCsrf;