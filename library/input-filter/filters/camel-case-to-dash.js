/**
 * CamelCaseToDash Filter
 * Converts camelCase strings to dash-separated strings
 *
 * Examples:
 * - 'camelCase' -> 'camel-case'
 * - 'MyClassName' -> 'my-class-name'
 * - 'HTMLParser' -> 'html-parser'
 */
class CamelCaseToDash {
  /**
   * Filter the value
   * @param {*} value - Value to filter
   * @returns {string} Value converted to dash-separated format
   */
  filter(value) {
    if(typeof value !== 'string') {
      value = String(value);
    }

    // Insert dash before uppercase letters and convert to lowercase
    return value
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .toLowerCase();
  }
}

module.exports = CamelCaseToDash;
