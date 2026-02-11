/**
 * StringTrim Filter
 * Removes whitespace from the beginning and end of the value
 */
class StringTrim {
  /**
   * Filter the value
   * @param {*} value - Value to filter
   * @returns {string} Value with whitespace trimmed
   */
  filter(value) {
    if(typeof value !== 'string') {
      value = String(value);
    }
    return value.trim();
  }
}

module.exports = StringTrim;
