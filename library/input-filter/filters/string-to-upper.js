/**
 * StringToUpper Filter
 * Converts the value to uppercase
 */
class StringToUpper {
  /**
   * Filter the value
   * @param {*} value - Value to filter
   * @returns {string} Value converted to uppercase
   */
  filter(value) {
    if(typeof value !== 'string') {
      value = String(value);
    }
    return value.toUpperCase();
  }
}

module.exports = StringToUpper;
