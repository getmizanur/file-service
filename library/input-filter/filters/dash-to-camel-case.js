// library/input-filter/filters/dash-to-camel-case.js
/**
 * DashToCamelCase Filter
 * Converts dash-separated strings to camelCase
 *
 * Examples:
 * - 'camel-case' -> 'camelCase'
 * - 'my-class-name' -> 'myClassName'
 * - 'html-parser' -> 'htmlParser'
 */
class DashToCamelCase {
  /**
   * Filter the value
   * @param {*} value - Value to filter
   * @returns {string} Value converted to camelCase format
   */
  filter(value) {
    if(typeof value !== 'string') {
      value = String(value);
    }

    // Replace dash followed by letter with uppercase letter
    return value.replace(/-([a-z])/g, (match, letter) => {
      return letter.toUpperCase();
    });
  }
}

module.exports = DashToCamelCase;
