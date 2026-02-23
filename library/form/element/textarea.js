// library/form/element/textarea.js
const Element = require('../element');

class Textarea extends Element {

  constructor(name = null) {
    super();

    if (name !== null && name !== undefined && name !== '') {
      this.setName(name);
    }

    // Do NOT set type="textarea" (invalid HTML)
    this.textContent = '';
  }

  /**
   * Set textarea content (inner text)
   * @param {string} content
   * @returns {Textarea}
   */
  setTextContent(content) {
    this.textContent = content != null ? String(content) : '';
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
   * Override setValue to set text content
   * @param {string} value
   * @returns {Textarea}
   */
  setValue(value) {
    this.textContent = value != null ? String(value) : '';
    return this;
  }

  /**
   * Override getValue to return text content
   * @returns {string}
   */
  getValue() {
    return this.textContent;
  }

}

module.exports = Textarea;