// library/input-filter/filters/alpha.js
/**
 * Alpha Filter
 * Removes all non-alphabetic characters from the value
 * Keeps only letters (a-z, A-Z)
 */
class Alpha {
  /**
   * Filter the value
   * @param {*} value - Value to filter
   * @returns {string} Value with only alphabetic characters
   */
  filter(value) {
    if(typeof value !== 'string') {
      return String(value);
    }
    // Remove all characters except letters
    return value.replace(/[^a-zA-Z]/g, '');
  }
}

module.exports = Alpha;