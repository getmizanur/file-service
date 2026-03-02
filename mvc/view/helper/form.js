// library/mvc/view/helper/form.js
const AbstractHelper = require('./abstract-helper');

class Form extends AbstractHelper {

  /**
   * If used directly in templates, render the open <form> tag by default:
   *   {{ form(formObj) }}
   */
  render(...args) {
    const { args: cleanArgs, context } = this._extractContext(args);
    const [form] = cleanArgs;

    // No form argument: return `this` so templates can chain
    // e.g. {{ form().openTag(loginForm) }} / {{ form().closeTag() }}
    if (!form) return this;

    return this.withContext(context, () => this.openTag(form));
  }

  /**
   * Render opening <form> tag
   * Accepts either:
   * - form.getAttributes()
   * - form.getAttribs() (legacy)
   */
  openTag(form) {
    if (!form) return '<form>';

    let tag = '<form ';

    const attribs =
      (typeof form.getAttributes === 'function' && form.getAttributes()) ||
      (typeof form.getAttribs === 'function' && form.getAttribs()) ||
      {};

    // Ensure object
    const attrs = (attribs && typeof attribs === 'object') ? attribs : {};

    for (const key in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, key)) continue;

      const val = attrs[key];

      // Skip null/undefined/false
      if (val === null || val === undefined || val === false) continue;

      // Boolean attributes (rare for form, but valid e.g. novalidate)
      if (val === true) {
        tag += `${key} `;
        continue;
      }

      tag += `${key}="${this._escapeAttr(val)}" `;
    }

    tag += '>';

    return tag;
  }

  /**
   * Render closing </form> tag
   */
  closeTag() {
    return '</form>';
  }

}

module.exports = Form;
