// library/input-filter/filters/dash-to-underscore.js
/**
 * DashToUnderscore Filter
 * Converts dash-separated strings to underscore_separated strings
 *
 * Examples:
 * - 'camel-case' -> 'camel_case'
 * - 'my-class-name' -> 'my_class_name'
 * - 'html-parser' -> 'html_parser'
 */
class DashToUnderscore {
  /**
   * Filter the value
   * @param {*} value - Value to filter
   * @returns {string} Value converted to underscore_separated format
   */
  filter(value) {
    if(typeof value !== 'string') {
      value = String(value);
    }

    // Replace all dashes with underscores
    return value.replace(/-/g, '_');
  }
}

module.exports = DashToUnderscore;