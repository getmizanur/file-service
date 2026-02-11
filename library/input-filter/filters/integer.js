/**
 * Integer Filter
 * Converts the value to an integer
 * Returns 0 for invalid values
 */
class Integer {
  /**
   * Filter the value
   * @param {*} value - Value to filter
   * @returns {number} Value converted to integer
   */
  filter(value) {
    // Parse the value to integer
    const parsed = parseInt(value, 10);

    // Return 0 if parsing failed (NaN)
    if(isNaN(parsed)) {
      return 0;
    }

    return parsed;
  }
}

module.exports = Integer;
