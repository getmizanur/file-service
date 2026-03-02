// library/form/element/checkbox.js
const Element = require('../element');

class Checkbox extends Element {

  constructor(name = null) {
    super();

    if (name !== null && name !== undefined && name !== '') {
      this.setName(name);
    }

    this.setAttribute('type', 'checkbox');

    this.checkedValue = '1';
    this.uncheckedValue = '0';

    // Default HTML value is the checked value
    this.setAttribute('value', this.checkedValue);
  }

  /**
   * Set the value when checkbox is checked
   * @param {string} value
   * @returns {Checkbox}
   */
  setCheckedValue(value) {
    this.checkedValue = String(value);
    this.setAttribute('value', this.checkedValue);
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
    this.uncheckedValue = String(value);
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
    if (checked) {
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
   * Accepts typical truthy post values.
   * @param {*} value
   * @returns {Checkbox}
   */
  setValue(value) {
    // Normalize current HTML "value" attribute (defaults to checkedValue)
    const htmlValue = this.getAttribute('value', this.checkedValue);

    const isChecked =
      value === this.checkedValue ||
      value === htmlValue ||
      value === true ||
      value === 1 ||
      value === '1' ||
      value === 'on' ||
      value === 'yes';

    this.setChecked(isChecked);

    // Keep HTML value attribute as checkedValue (standard checkbox behaviour)
    this.setAttribute('value', this.checkedValue);

    return this;
  }

  /**
   * Get the current logical value (checked or unchecked value)
   * @returns {string}
   */
  getValue() {
    return this.isChecked() ? this.checkedValue : this.uncheckedValue;
  }
}

module.exports = Checkbox;