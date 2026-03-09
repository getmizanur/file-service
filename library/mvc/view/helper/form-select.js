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
      const { attributes, selectedValue } = this._prepareAttributes(element, extraAttribs);

      let select = '<select ';
      select += this._serializeAttribs(attributes);
      select += '>';

      select += this._renderEmptyOption(element);
      select += this._renderOptions(element, selectedValue);

      select += '</select>';
      return select;
    });
  }

  _prepareAttributes(element, extraAttribs) {
    const elementAttribs = (typeof element.getAttributes === 'function')
      ? (element.getAttributes() || {})
      : {};

    const attributes = { ...elementAttribs, ...extraAttribs };
    delete attributes.type;

    const selectedValue = attributes.value;
    delete attributes.value;

    if (attributes.class) {
      const classList = String(attributes.class).split(/\s+/).filter(Boolean);
      attributes.class = Array.from(new Set(classList)).join(' ');
    }

    return { attributes, selectedValue };
  }

  _serializeAttribs(attribs) {
    let result = '';
    for (const key in attribs) {
      if (!Object.prototype.hasOwnProperty.call(attribs, key)) continue;
      const val = attribs[key];
      if (val === undefined || val === null || val === false) continue;
      if (val === true) { result += `${key} `; continue; }
      result += `${key}="${this._escapeAttr(val)}" `;
    }
    return result;
  }

  _renderEmptyOption(element) {
    const emptyOption = (typeof element.getEmptyOption === 'function') ? element.getEmptyOption() : null;
    if (!emptyOption) return '';
    const v = emptyOption.value !== undefined ? emptyOption.value : '';
    const l = emptyOption.label !== undefined ? emptyOption.label : '';
    return `<option value="${this._escapeAttr(v)}">${this._escapeHtml(l)}</option>`;
  }

  _renderOptions(element, selectedValue) {
    const options = (typeof element.getOptions === 'function') ? (element.getOptions() || []) : [];
    let html = '';
    options.forEach(option => {
      html += this._renderSingleOption(option, selectedValue);
    });
    return html;
  }

  _renderSingleOption(option, selectedValue) {
    const optionValue = (option?.value !== undefined) ? option.value : '';
    const optionLabel = (option?.label !== undefined) ? option.label : optionValue;

    let html = `<option value="${this._escapeAttr(optionValue)}"`;
    if (this.isSelected(selectedValue, optionValue)) html += ' selected="selected"';

    if (option?.attributes && typeof option.attributes === 'object') {
      html += ' ' + this._serializeAttribs(option.attributes);
    }

    html += `>${this._escapeHtml(optionLabel)}</option>`;
    return html;
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