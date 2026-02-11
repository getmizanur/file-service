const Element = require('../element');

class Textarea extends Element {

  constructor(name = null) {
    super();

    this.setName(name);
    this.setAttribute('type', 'textarea');
    this.textContent = '';
  }

  /**
   * Set textarea content (different from value attribute)
   * @param {string} content
   * @returns {Textarea}
   */
  setTextContent(content) {
    this.textContent = content;
    return this;
  }

  /**
   * Get textarea content
   * @returns {string}
   */
  getTextContent() {
    return this.textContent;
  }

  /**
   * Override setValue to set text content for textarea
   * @param {string} value
   * @returns {Textarea}
   */
  setValue(value) {
    this.textContent = value || '';
    return this;
  }

  /**
   * Override getValue to get text content
   * @returns {string}
   */
  getValue() {
    return this.textContent;
  }

}

module.exports = Textarea;