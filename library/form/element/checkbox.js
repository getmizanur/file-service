const Element = require('../element');

class Checkbox extends Element {

  constructor(name = null) {
    super();

    this.setName(name);
    this.setAttribute('type', 'checkbox');
    this.checkedValue = '1';
    this.uncheckedValue = '0';
  }

  /**
   * Set the value when checkbox is checked
   * @param {string} value
   * @returns {Checkbox}
   */
  setCheckedValue(value) {
    this.checkedValue = value;
    this.setAttribute('value', value);
    return this;
  }

  /**
   * Get checked value
   * @returns {string}
   */
  getCheckedValue() {
    return this.checkedValue;
  }

  /**
   * Set the value when checkbox is unchecked
   * @param {string} value
   * @returns {Checkbox}
   */
  setUncheckedValue(value) {
    this.uncheckedValue = value;
    return this;
  }

  /**
   * Get unchecked value
   * @returns {string}
   */
  getUncheckedValue() {
    return this.uncheckedValue;
  }

  /**
   * Set checkbox as checked
   * @param {boolean} checked
   * @returns {Checkbox}
   */
  setChecked(checked) {
    if(checked) {
      this.setAttribute('checked', 'checked');
    } else {
      this.removeAttribute('checked');
    }
    return this;
  }

  /**
   * Check if checkbox is checked
   * @returns {boolean}
   */
  isChecked() {
    return this.getAttribute('checked') === 'checked';
  }

  /**
   * Override setValue to handle checkbox state
   * @param {*} value
   * @returns {Checkbox}
   */
  setValue(value) {
    // Check if value matches checked value
    if(value === this.checkedValue ||
      value === true ||
      value === 1 ||
      value === '1' ||
      value === 'on' ||
      value === 'yes') {
      this.setChecked(true);
    } else {
      this.setChecked(false);
    }

    // Always set the value attribute to checked value
    this.setAttribute('value', this.checkedValue);

    return this;
  }

  /**
   * Get the current value (checked or unchecked value)
   * @returns {string}
   */
  getValue() {
    return this.isChecked() ? this.checkedValue : this.uncheckedValue;
  }

}

module.exports = Checkbox;