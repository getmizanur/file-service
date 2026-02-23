// library/input-filter/filters/camel-case-to-separator.js
/**
 * CamelCaseToSeparator Filter
 * Converts camelCase strings to custom separator-separated strings
 *
 * Usage in InputFilter:
 * {
 *   name: 'CamelCaseToSeparator',
 *   options: {
 *     separator: '_'  // or any other separator
 *   }
 * }
 *
 * Examples:
 * - 'camelCase' with separator '_' -> 'camel_case'
 * - 'MyClassName' with separator '.' -> 'my.class.name'
 * - 'HTMLParser' with separator '-' -> 'html-parser'
 */
class CamelCaseToSeparator {
  /**
   * Constructor
   * @param {Object} options - Filter options
   * @param {string} options.separator - Separator to use (default: ' ')
   */
  constructor(options = {}) {
    this.separator = options.separator !== undefined ? options.separator : ' ';
  }

  /**
   * Filter the value
   * @param {*} value - Value to filter
   * @returns {string} Value converted to separator-separated format
   */
  filter(value) {
    if(typeof value !== 'string') {
      value = String(value);
    }

    // Insert separator before uppercase letters and convert to lowercase
    return value
      .replace(/([a-z0-9])([A-Z])/g, `$1${this.separator}$2`)
      .replace(/([A-Z])([A-Z][a-z])/g, `$1${this.separator}$2`)
      .toLowerCase();
  }
}

module.exports = CamelCaseToSeparator;