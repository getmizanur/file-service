// library/input-filter/filters/boolean.js
/**
 * Boolean Filter
 * Converts various boolean representations to string '1' or '0'
 *
 * Handles:
 * - Arrays (e.g., ['0', '1'] from checkboxes) - checks if '1' is present
 * - Truthy values ('1', 1, true, 'true', 'on') - converts to '1'
 * - Falsy values ('0', 0, false, 'false', null, undefined) - converts to '0'
 */
class Boolean {
  /**
   * Filter the value
   * @param {*} value - Value to filter
   * @returns {string} '1' if truthy, '0' if falsy
   */
  filter(value) {
    // Handle array (e.g., from checkbox with hidden input)
    if(Array.isArray(value)) {
      // If array contains '1', value is true
      return value.includes('1') ? '1' : '0';
    }

    // Handle truthy values
    if(value === '1' || value === 1 || value === true ||
      value === 'true' || value === 'on') {
      return '1';
    }

    // All other values (including '0', 0, false, null, undefined)
    // are falsy
    return '0';
  }
}

module.exports = Boolean;
