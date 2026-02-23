// library/input-filter/filters/callback.js
/**
 * Callback Filter
 * Applies a custom callback function to transform the value
 *
 * Usage in InputFilter:
 * {
 *   name: 'Callback',
 *   options: {
 *     callback: (value) => {
 *       // Custom transformation logic
 *       return transformedValue;
 *     }
 *   }
 * }
 */
class Callback {
  /**
   * Constructor
   * @param {Object} options - Filter options
   * @param {Function} options.callback - Callback function to apply
   */
  constructor(options = {}) {
    if(!options.callback || typeof options.callback !== 'function') {
      throw new Error('Callback filter requires a valid callback function in options');
    }
    this.callback = options.callback;
  }

  /**
   * Filter the value using the callback function
   * @param {*} value - Value to filter
   * @returns {*} Value transformed by callback
   */
  filter(value) {
    return this.callback(value);
  }
}

module.exports = Callback;