// library/input-filter/filters/preg-replace.js
/**
 * PregReplace Filter
 * Performs regular expression search and replace on the value
 *
 * Usage in InputFilter:
 * {
 *   name: 'PregReplace',
 *   options: {
 *     pattern: /[^a-z0-9]/gi,
 *     replacement: ''
 *   }
 * }
 */
class PregReplace {
  /**
   * Constructor
   * @param {Object} options - Filter options
   * @param {RegExp|string} options.pattern - Regular expression pattern
   * @param {string} options.replacement - Replacement string (default: '')
   */
  constructor(options = {}) {
    if(!options.pattern) {
      throw new Error('PregReplace filter requires a pattern in options');
    }

    // Convert string pattern to RegExp if needed
    if(typeof options.pattern === 'string') {
      this.pattern = new RegExp(options.pattern, 'g');
    } else {
      this.pattern = options.pattern;
    }

    this.replacement = options.replacement !== undefined ? options.replacement : '';
  }

  /**
   * Filter the value
   * @param {*} value - Value to filter
   * @returns {string} Value with pattern replaced
   */
  filter(value) {
    if(typeof value !== 'string') {
      value = String(value);
    }
    return value.replace(this.pattern, this.replacement);
  }
}

module.exports = PregReplace;