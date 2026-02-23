// library/core/common/abstract-option.js
class AbstractOption {
  constructor(options = {}) {
    if (new.target === AbstractOption) {
      throw new Error('AbstractOption cannot be instantiated directly');
    }

    this._options = options;

    this._applyOptions(options);
  }

  /**
   * Apply options using setter methods
   * Example:
   *   setUserOptions({ ... }) → calls this.setUserOptions()
   */
  _applyOptions(options) {
    Object.entries(options).forEach(([key, value]) => {
      const method = this._keyToSetter(key);

      if (typeof this[method] === 'function') {
        this[method](value);
      } else {
        // Fail fast like Zend (optional)
        throw new Error(
          `Unknown option "${key}" for ${this.constructor.name}`
        );
      }
    });
  }

  /**
   * Convert snake_case or camelCase to setter name
   * user_options → setUserOptions
   */
  _keyToSetter(key) {
    return (
      'set' +
      key
        .replace(/[_-](\w)/g, (_, c) => c.toUpperCase())
        .replace(/^\w/, c => c.toUpperCase())
    );
  }

  /**
   * Utility for child classes
   */
  getRawOptions() {
    return this._options;
  }
}

module.exports = AbstractOption;