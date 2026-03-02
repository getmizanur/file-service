// library/input-filter/filters/string-to-lower.js
/**
 * StringToLower Filter
 * Converts the value to lowercase
 */
class StringToLower {
  /**
   * Filter the value
   * @param {*} value - Value to filter
   * @returns {string} Value converted to lowercase
   */
  filter(value) {
    if(typeof value !== 'string') {
      value = String(value);
    }
    return value.toLowerCase();
  }
}

module.exports = StringToLower;
