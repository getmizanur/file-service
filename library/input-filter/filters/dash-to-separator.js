// library/input-filter/filters/dash-to-separator.js
/**
 * DashToSeparator Filter
 * Converts dash-separated strings to custom separator-separated strings
 *
 * Usage in InputFilter:
 * {
 *   name: 'DashToSeparator',
 *   options: {
 *     separator: '_'  // or any other separator
 *   }
 * }
 *
 * Examples:
 * - 'camel-case' with separator '_' -> 'camel_case'
 * - 'my-class-name' with separator '.' -> 'my.class.name'
 * - 'html-parser' with separator ' ' -> 'html parser'
 */
class DashToSeparator {
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

    // Replace all dashes with the specified separator
    return value.replace(/-/g, this.separator);
  }
}

module.exports = DashToSeparator;