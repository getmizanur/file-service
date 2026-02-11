const AbstractHelper = require('./abstract-helper');

class FormSelect extends AbstractHelper {
  /**
   * Render a select dropdown element
   * @param {Element} element - The form element
   * @param {Object} extraAttribs - Optional extra attributes (e.g. { class: '...' })
   * @returns {string}
   */
  render(...args) {
    const cleanArgs = this._extractContext(args);
    const [element, extraAttribs = {}] = cleanArgs;

    if(element == undefined) {
      return '';
    }

    let select = '<select ';
    let attributes = Object.assign({}, element.getAttributes(), extraAttribs);

    // Remove 'type' attribute as it's not valid for select
    delete attributes.type;

    // Extract value separately
    const selectedValue = attributes.value;
    delete attributes.value;

    // Handle class attribute - merge and deduplicate
    let classList = [];
    if(attributes.class) {
      classList = attributes.class.split(' ');
      // Remove duplicate classes
      attributes.class = Array.from(new Set(classList)).join(' ');
    }

    // Build attributes string
    for(let key in attributes) {
      if(attributes[key] !== undefined && attributes[key] !== null) {
        select += key + '="' + this.escapeHtml(attributes[key]) + '" ';
      }
    }

    select += '>';

    // Add empty option if set
    const emptyOption = element.getEmptyOption?.();
    if(emptyOption) {
      select += '<option value="' + this.escapeHtml(emptyOption.value) + '">';
      select += this.escapeHtml(emptyOption.label);
      select += '</option>';
    }

    // Add options
    const options = element.getOptions?.() || [];
    options.forEach(option => {
      const optionValue = option.value !== undefined ? option.value : '';
      const optionLabel = option.label !== undefined ? option.label : optionValue;
      const isSelected = this.isSelected(selectedValue, optionValue);

      select += '<option value="' + this.escapeHtml(optionValue) + '"';

      if(isSelected) {
        select += ' selected="selected"';
      }

      // Add any additional option attributes
      if(option.attributes) {
        for(let key in option.attributes) {
          if(option.attributes[key] !== undefined && option.attributes[key] !== null) {
            select += ' ' + key + '="' + this.escapeHtml(option.attributes[key]) + '"';
          }
        }
      }

      select += '>';
      select += this.escapeHtml(optionLabel);
      select += '</option>';
    });

    select += '</select>';

    return select;
  }

  /**
   * Check if an option value is selected
   * @param {*} selectedValue
   * @param {*} optionValue
   * @returns {boolean}
   */
  isSelected(selectedValue, optionValue) {
    if(selectedValue === undefined || selectedValue === null) {
      return false;
    }

    if(Array.isArray(selectedValue)) {
      return selectedValue.includes(optionValue);
    }

    return selectedValue == optionValue;
  }

  /**
   * Escape HTML special characters to prevent XSS
   * @param {string} text
   * @returns {string}
   */
  escapeHtml(text) {
    if(text === null || text === undefined) return '';

    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };

    return text.toString().replace(/[&<>"']/g, (m) => map[m]);
  }
}

module.exports = FormSelect;