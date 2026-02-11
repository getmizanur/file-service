const Element = require('../element');

class Select extends Element {

  constructor(name = null) {
    super();

    this.setName(name);
    this.setAttribute('type', 'select');
    this.options = [];
    this.emptyOption = null;
  }

  /**
   * Set options for the select dropdown
   * @param {Array|Object} options - Options as array of objects [{value: 'val', label: 'Label'}] or object {value: 'label'}
   * @returns {Select}
   */
  setOptions(options) {
    if(Array.isArray(options)) {
      // Array of objects: [{value: 'val', label: 'Label'}]
      this.options = options.map(opt => {
        if(typeof opt === 'object' && opt.value !== undefined) {
          return {
            value: opt.value,
            label: opt.label || opt.value,
            attributes: opt.attributes || {}
          };
        }
        return {
          value: opt,
          label: opt,
          attributes: {}
        };
      });
    } else if(typeof options === 'object') {
      // Object format: {value: 'label'}
      this.options = Object.keys(options).map(key => ({
        value: key,
        label: options[key],
        attributes: {}
      }));
    }

    return this;
  }

  /**
   * Get options
   * @returns {Array}
   */
  getOptions() {
    return this.options;
  }

  /**
   * Set empty option (placeholder)
   * @param {string} label - Label for empty option
   * @param {string} value - Value for empty option (default: '')
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
    if(Array.isArray(selectedValue)) {
      return selectedValue.includes(optionValue);
    }
    return selectedValue == optionValue;
  }

}

module.exports = Select;