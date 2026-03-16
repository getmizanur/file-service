// library/mvc/view/helper/form-xhtml.js
const AbstractHelper = require('./abstract-helper');

/**
 * Renders an Xhtml form element as an open/close tag with inner HTML content.
 *
 * Output: <tag attributes>...content...</tag>
 *
 * The element's content (via getContent()) is rendered as raw HTML,
 * allowing SVG icons, images, or nested markup inside the tag.
 */
class FormXhtml extends AbstractHelper {

  /**
   * Render an Xhtml element
   * @param {Xhtml} element - The form element
   * @param {Object} extraAttribs - Optional extra attributes
   * @returns {string}
   */
  render(...args) {
    const { args: cleanArgs, context } = this._extractContext(args);
    const [element, extraAttribs = {}] = cleanArgs;

    if (!element) {
      return '';
    }

    return this.withContext(context, () => {
      const tag = (typeof element.getTag === 'function')
        ? element.getTag()
        : 'div';

      const elementAttribs = (typeof element.getAttributes === 'function')
        ? (element.getAttributes() || {})
        : {};

      const attributes = { ...elementAttribs, ...extraAttribs };

      // 'value' is not relevant for open/close tags with content
      if (Object.hasOwn(attributes, 'value')) {
        delete attributes.value;
      }

      // Merge/dedupe class attribute
      if (attributes.class) {
        const classList = String(attributes.class).split(/\s+/).filter(Boolean);
        attributes.class = Array.from(new Set(classList)).join(' ');
      }

      let html = `<${tag} `;

      for (const key in attributes) {
        if (!Object.hasOwn(attributes, key)) continue;

        const val = attributes[key];

        if (val === null || val === undefined || val === false) continue;

        if (val === true) {
          html += `${key} `;
          continue;
        }

        html += `${key}="${this._escapeAttr(val)}" `;
      }

      html += '>';

      // Inner content is rendered as raw HTML (not escaped)
      const content = (typeof element.getContent === 'function')
        ? (element.getContent() || '')
        : '';

      html += content;
      html += `</${tag}>`;

      return html;
    });
  }
}

module.exports = FormXhtml;
