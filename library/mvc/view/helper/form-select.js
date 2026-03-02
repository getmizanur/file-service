// library/mvc/view/helper/form-select.js
const AbstractHelper = require('./abstract-helper');

class FormSelect extends AbstractHelper {

  /**
   * Render a select dropdown element
   * @param {Element} element - The form element
   * @param {Object} extraAttribs - Optional extra attributes (e.g. { class: '...' })
   * @returns {string}
   */
  render(...args) {
    const { args: cleanArgs, context } = this._extractContext(args);
    const [element, extraAttribs = {}] = cleanArgs;

    if (!element) {
      return '';
    }

    return this.withContext(context, () => {
      let select = '<select ';

      const elementAttribs = (typeof element.getAttributes === 'function')
        ? (element.getAttributes() || {})
        : {};

      const attributes = Object.assign({}, elementAttribs, extraAttribs);

      // 'type' is not valid for <select>
      if (Object.prototype.hasOwnProperty.call(attributes, 'type')) {
        delete attributes.type;
      }

      // Extract selected value(s) separately
      const selectedValue = attributes.value;
      if (Object.prototype.hasOwnProperty.call(attributes, 'value')) {
        delete attributes.value;
      }

      // Merge/dedupe classes
      if (attributes.class) {
        const classList = String(attributes.class).split(/\s+/).filter(Boolean);
        attributes.class = Array.from(new Set(classList)).join(' ');
      }

      // Build attributes string
      for (const key in attributes) {
        if (!Object.prototype.hasOwnProperty.call(attributes, key)) continue;

        const val = attributes[key];

        // Skip null/undefined/false
        if (val === undefined || val === null || val === false) continue;

        // Boolean attributes (rare on select, but valid for e.g. multiple, disabled, required)
        if (val === true) {
          select += `${key} `;
          continue;
        }

        select += `${key}="${this._escapeAttr(val)}" `;
      }

      select += '>';

      // Add empty option if set
      const emptyOption = (typeof element.getEmptyOption === 'function') ? element.getEmptyOption() : null;
      if (emptyOption) {
        const v = emptyOption.value !== undefined ? emptyOption.value : '';
        const l = emptyOption.label !== undefined ? emptyOption.label : '';
        select += `<option value="${this._escapeAttr(v)}">${this._escapeHtml(l)}</option>`;
      }

      // Add options
      const options = (typeof element.getOptions === 'function') ? (element.getOptions() || []) : [];
      options.forEach(option => {
        const optionValue = (option && option.value !== undefined) ? option.value : '';
        const optionLabel = (option && option.label !== undefined) ? option.label : optionValue;

        const isSelected = this.isSelected(selectedValue, optionValue);

        select += `<option value="${this._escapeAttr(optionValue)}"`;

        if (isSelected) {
          select += ' selected="selected"';
        }

        // Add any additional option attributes
        if (option && option.attributes && typeof option.attributes === 'object') {
          for (const k in option.attributes) {
            if (!Object.prototype.hasOwnProperty.call(option.attributes, k)) continue;

            const v = option.attributes[k];
            if (v === undefined || v === null || v === false) continue;

            if (v === true) {
              select += ` ${k}`;
              continue;
            }

            select += ` ${k}="${this._escapeAttr(v)}"`;
          }
        }

        select += '>';
        select += this._escapeHtml(optionLabel);
        select += '</option>';
      });

      select += '</select>';

      return select;
    });
  }

  /**
   * Check if an option value is selected
   * @param {*} selectedValue
   * @param {*} optionValue
   * @returns {boolean}
   */
  isSelected(selectedValue, optionValue) {
    if (selectedValue === undefined || selectedValue === null) {
      return false;
    }

    if (Array.isArray(selectedValue)) {
      // Ensure consistent compare for numbers/strings
      return selectedValue.map(String).includes(String(optionValue));
    }

    return String(selectedValue) === String(optionValue);
  }
}

module.exports = FormSelect;