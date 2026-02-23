// library/input-filter/filters/camel-case-to-underscore.js
/**
 * CamelCaseToUnderscore Filter
 * Converts camelCase strings to underscore_separated strings
 *
 * Examples:
 * - 'camelCase' -> 'camel_case'
 * - 'MyClassName' -> 'my_class_name'
 * - 'HTMLParser' -> 'html_parser'
 */
class CamelCaseToUnderscore {
  /**
   * Filter the value
   * @param {*} value - Value to filter
   * @returns {string} Value converted to underscore_separated format
   */
  filter(value) {
    if(typeof value !== 'string') {
      value = String(value);
    }

    // Insert underscore before uppercase letters and convert to lowercase
    return value
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
      .toLowerCase();
  }
}

module.exports = CamelCaseToUnderscore;