const AbstractValidator = require('./abstract-validator');

/**
 * Callback Validator
 *
 * Allows custom validation logic via callback function
 *
 * Features:
 * - Validates callback exists and is a function
 * - Error handling for callback exceptions
 * - Flexible return values (boolean, object, string, truthy/falsy)
 * - Support for custom error messages from callback
 * - Safe context handling with defaults
 *
 * Usage Examples:
 *
 * 1. Simple boolean return:
 *    callback: (value) => value.length > 5
 *
 * 2. Object with custom message:
 *    callback: (value) => {
 *      if (value.length < 5) {
 *        return { valid: false, message: 'Must be at least 5 characters' };
 *      }
 *      return { valid: true };
 *    }
 *
 * 3. String as error message:
 *    callback: (value) => {
 *      if (value.length < 5) return 'Too short!';
 *      return true;  // or null/undefined for success
 *    }
 *
 * 4. With context:
 *    callback: (value, context) => {
 *      return value === context.confirmPassword;
 *    }
 */
class Callback extends AbstractValidator {

  constructor(options = {}) {
    super();

    // Validate callback is provided and is a function
    if (!options.callback || typeof options.callback !== 'function') {
      throw new Error(
        'Callback validator requires a valid callback function in options.callback'
      );
    }

    this.callback = options.callback;
    this.messageTemplates = options.messageTemplate || {
      INVALID: 'The input value is invalid',
      CALLBACK_ERROR: 'An error occurred during validation'
    };

    // allow override
    if(options.messageTemplates) {
      this.setMessageTemplates(options.messageTemplates);
    }

    this.messages = null;
  }

  setMessageTemplates(templates) {
    this.messageTemplates = {
      ...this.messageTemplates,
      ...templates
    };

    return this;
  }

  error(key = 'INVALID') {
    const message =
      this.messageTemplates[key] || this.messageTemplates.INVALID;

    this.messages[key] = message;
  }

  /**
   * Validate value using callback
   * @param {*} value - Value to validate
   * @param {Object} context - Context object with other field values
   * @returns {boolean} True if valid, false otherwise
   */
  isValid(value, context = {}) {
    // IMPORTANT: reset messages every run
    this.messages = {};

    try {
      const result = this.callback(value, context, this);

      // Simple boolean failure
      if (result === false) {
        this.error('INVALID');
        return false;
      }

      // Object-based failure
      if (typeof result === 'object' && result !== null) {
        if (result.valid === false) {
          if (result.key) {
            this.error(result.key);
          } else if (Array.isArray(result.keys)) {
            // Support multiple failures at once
            result.keys.forEach(k => this.error(k));
          } else {
            this.error('INVALID');
          }
          return false;
        }
        return true;
      }

      return true;
    } catch (err) {
      this.error('CALLBACK_ERROR');
      return false;
    }
  }

  /**
   * Return messages as array (InputFilter-friendly)
   */
  getMessages() {
    return Object.values(this.messages);
  }

  /**
   * Set message template or current message
   * @param {string} message - Message to set
   * @param {string} key - Template key (optional)
   */
  setMessage(message, key) {
    if (key && this.messageTemplates.hasOwnProperty(key)) {
      this.messageTemplates[key] = message;
    } else {
      this.messages = message;
    }
  }

  /**
   * Get validator class name
   * @returns {string} Class name
   */
  getClass() {
    return this.constructor.name;
  }

}

module.exports = Callback;