const AbstractHelper = require('./abstract-helper');

class FormCheckbox extends AbstractHelper {

  /**
   * Render a checkbox input element
   * @param {Element} element - The form element
   * @param {Object} extraAttribs - Optional extra attributes (e.g. { class: '...' })
   * @returns {string}
   */
  render(...args) {
    const { args: cleanArgs, context } = this._extractContext(args);
    const [element, extraAttribs = {}] = cleanArgs;

    if (element === undefined || element === null) {
      return '';
    }

    return this.withContext(context, () => {
      let html = '';

      const elementAttribs = (typeof element.getAttributes === 'function')
        ? (element.getAttributes() || {})
        : {};

      // Merge element attributes with extra attributes
      const attributes = Object.assign({}, elementAttribs, extraAttribs);

      // Merge and dedupe class attribute
      if (attributes.class) {
        const classList = String(attributes.class)
          .split(/\s+/)
          .filter(Boolean);

        attributes.class = Array.from(new Set(classList)).join(' ');
      }

      // Add hidden input for unchecked value if available
      const uncheckedValue = (typeof element.getUncheckedValue === 'function')
        ? element.getUncheckedValue()
        : undefined;

      const nameAttr = attributes.name;

      if (uncheckedValue !== undefined && uncheckedValue !== null && nameAttr !== undefined && nameAttr !== null) {
        html += '<input type="hidden" ';
        html += 'name="' + this._escapeAttr(nameAttr) + '" ';
        html += 'value="' + this._escapeAttr(uncheckedValue) + '" />';
      }

      // Ensure it's a checkbox if not provided
      if (!attributes.type) {
        attributes.type = 'checkbox';
      }

      // Build checkbox input
      html += '<input ';

      for (const key in attributes) {
        if (!Object.prototype.hasOwnProperty.call(attributes, key)) continue;

        const val = attributes[key];

        // Skip null/undefined/false attributes
        if (val === undefined || val === null || val === false) continue;

        // Boolean attributes (checked, disabled, required, etc.)
        if (val === true) {
          html += key + ' ';
          continue;
        }

        html += key + '="' + this._escapeAttr(val) + '" ';
      }

      html += '/>';

      return html;
    });
  }
}

module.exports = FormCheckbox;