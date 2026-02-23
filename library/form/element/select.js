// library/form/element/select.js
const Element = require('../element');

class Select extends Element {

  constructor(name = null) {
    super();

    if (name !== null && name !== undefined && name !== '') {
      this.setName(name);
    }

    // In your framework helpers, you check type='select'
    this.setAttribute('type', 'select');

    // Avoid clashing with Element.options (general options bucket)
    this.valueOptions = [];
    this.emptyOption = null;
  }

  /**
   * Set options for the select dropdown
   * @param {Array|Object} options - Array [{value,label,attributes}] or object {value: label}
   * @returns {Select}
   */
  setOptions(options) {
    // null guard
    if (options === null || options === undefined) {
      this.valueOptions = [];
      return this;
    }

    if (Array.isArray(options)) {
      this.valueOptions = options.map(opt => {
        if (opt && typeof opt === 'object' && opt.value !== undefined) {
          return {
            value: opt.value,
            label: opt.label !== undefined ? opt.label : opt.value,
            attributes: opt.attributes || {}
          };
        }

        return {
          value: opt,
          label: opt,
          attributes: {}
        };
      });

      return this;
    }

    if (typeof options === 'object') {
      this.valueOptions = Object.keys(options).map(key => ({
        value: key,
        label: options[key],
        attributes: {}
      }));
      return this;
    }

    // Any other type => ignore
    return this;
  }

  /**
   * Get options
   * @returns {Array}
   */
  getOptions() {
    return this.valueOptions;
  }

  /**
   * Set empty option (placeholder)
   * @param {string} label
   * @param {string} value
   * @returns {Select}
   */
  setEmptyOption(label, value = '') {
    this.emptyOption = {
      value,
      label
    };
    return this;
  }

  /**
   * Get empty option
   * @returns {Object|null}
   */
  getEmptyOption() {
    return this.emptyOption;
  }

  /**
   * Check if a value is selected
   * @param {string} optionValue
   * @returns {boolean}
   */
  isSelected(optionValue) {
    const selectedValue = this.getValue();
    const ov = (optionValue === null || optionValue === undefined) ? '' : String(optionValue);

    if (Array.isArray(selectedValue)) {
      return selectedValue.map(v => String(v)).includes(ov);
    }

    if (selectedValue === null || selectedValue === undefined) {
      return false;
    }

    return String(selectedValue) === ov;
  }

}

module.exports = Select;