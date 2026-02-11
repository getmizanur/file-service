/**
 * Alnum Filter
 * Removes all non-alphanumeric characters from the value
 * Keeps only letters (a-z, A-Z) and digits (0-9)
 */
class Alnum {
  /**
   * Filter the value
   * @param {*} value - Value to filter
   * @returns {string} Value with only alphanumeric characters
   */
  filter(value) {
    if(typeof value !== 'string') {
      return String(value);
    }
    // Remove all characters except letters and numbers
    return value.replace(/[^a-zA-Z0-9]/g, '');
  }
}

module.exports = Alnum;
