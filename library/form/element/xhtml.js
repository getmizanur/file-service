// library/form/element/xhtml.js
const Element = require('../element');

/**
 * Xhtml - A generic open/close tag element that supports inner HTML content.
 *
 * Unlike self-closing elements (input, hidden), this renders as:
 *   <tag attributes>...content...</tag>
 *
 * Use this as a base class for custom elements such as icon buttons,
 * image buttons, or any element that needs child markup.
 *
 * Example:
 *   const el = new Xhtml('clear');
 *   el.setTag('button');
 *   el.setAttributes({ type: 'button', class: 'btn btn-link', title: 'Clear' });
 *   el.setContent('<svg>...</svg>');
 */
class Xhtml extends Element {

  constructor(name = null) {
    super();

    this.tag = 'div';
    this.content = '';

    if (name !== null && name !== undefined && name !== '') {
      this.setName(name);
    }
  }

  /**
   * Set the HTML tag name (e.g. 'button', 'span', 'a')
   * @param {string} tag
   * @returns {Xhtml}
   */
  setTag(tag) {
    this.tag = String(tag).toLowerCase();
    return this;
  }

  /**
   * @returns {string}
   */
  getTag() {
    return this.tag;
  }

  /**
   * Set inner HTML content (not escaped on output)
   * @param {string} html
   * @returns {Xhtml}
   */
  setContent(html) {
    this.content = html == null ? '' : String(html);
    return this;
  }

  /**
   * @returns {string}
   */
  getContent() {
    return this.content;
  }

  /**
   * Append HTML content
   * @param {string} html
   * @returns {Xhtml}
   */
  appendContent(html) {
    this.content += html == null ? '' : String(html);
    return this;
  }
}

module.exports = Xhtml;
