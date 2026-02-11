const AbstractHelper = require('./abstract-helper');

class FormPassword extends AbstractHelper {

  /**
   * Render a password input element
   * @param {Element} element - The form element
   * @param {Object} extraAttribs - Optional extra attributes (e.g. { class: '...' })
   * @returns {string}
   */
  render(...args) {
    const cleanArgs = this._extractContext(args);
    const [element, extraAttribs = {}] = cleanArgs;

    if(element == undefined) {
      return;
    }
    let input = '<input ';
    let attributes = Object.assign({}, element.getAttributes(), extraAttribs);
    let classList = [];
    if(attributes.class) {
      classList = attributes.class.split(' ');
      // Remove duplicate classes
      attributes.class = Array.from(new Set(classList)).join(' ');
    }
    for(let key in attributes) {
      if(attributes[key] !== undefined && attributes[key] !== null) {
        input += key + '="' + attributes[key] + '" ';
      }
    }
    input += '/>';
    return input;
  }

}

module.exports = FormPassword;