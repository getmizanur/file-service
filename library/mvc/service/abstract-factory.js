/**
 * Abstract Factory for Service Creation
 * All service factories should extend this abstract class
 */
class AbstractFactory {

  /**
   * Create service instance with dependencies
   * @param {ServiceManager} serviceManager - Service manager instance
   * @returns {Object} - Service instance
   */
  createService(serviceManager) {
    throw new Error('AbstractFactory::createService() must be implemented by subclass');
  }

  /**
   * Get factory interface version for compatibility checking
   * @returns {string}
   */
  static getFactoryVersion() {
    return '1.0.0';
  }

  /**
   * Validate factory configuration before service creation.
   * Override this method to add custom validation.
   *
   * Backwards compatible:
   * - may return boolean
   * - OR return { ok: boolean, errors: string[] }
   *
   * @param {Object} config - Configuration object
   * @returns {boolean|{ok:boolean, errors:string[]}}
   */
  validateConfiguration(config) {
    return true;
  }

  /**
   * Get required configuration keys for this factory
   * Override to specify required config keys.
   *
   * Supports dot paths (e.g. 'database.host').
   *
   * @returns {Array<string>}
   */
  getRequiredConfigKeys() {
    return [];
  }

  /**
   * Validate required configuration keys exist.
   *
   * Backwards compatible:
   * - returns boolean by default
   * - if you pass { returnErrors: true } returns { ok, errors }
   *
   * @param {Object} config
   * @param {Object} [options]
   * @param {boolean} [options.returnErrors=false]
   * @returns {boolean|{ok:boolean, errors:string[]}}
   */
  validateRequiredConfig(config, options = {}) {
    const requiredKeys = this.getRequiredConfigKeys();
    const errors = [];

    for (const key of requiredKeys) {
      if (!this.hasNestedKey(config, key)) {
        errors.push(`Missing required configuration key: ${key}`);
      }
    }

    const result = { ok: errors.length === 0, errors };

    if (options.returnErrors) {
      return result;
    }

    return result.ok;
  }

  /**
   * Check if nested key exists in configuration object
   * @param {Object} obj - Configuration object
   * @param {string} keyPath - Dot-separated key path (e.g., 'database.host')
   * @returns {boolean}
   */
  hasNestedKey(obj, keyPath) {
    if (!obj || typeof obj !== 'object') return false;

    const keys = String(keyPath).split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return false;
      }

      if (!Object.prototype.hasOwnProperty.call(current, key)) {
        return false;
      }

      current = current[key];
    }

    return true;
  }

  /**
   * Get nested configuration value
   * @param {Object} obj - Configuration object
   * @param {string} keyPath - Dot-separated key path (e.g., 'database.host')
   * @param {*} defaultValue - Default value if key not found
   * @returns {*}
   */
  getNestedConfig(obj, keyPath, defaultValue = null) {
    if (!obj || typeof obj !== 'object') return defaultValue;

    const keys = String(keyPath).split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultValue;
      }

      if (!Object.prototype.hasOwnProperty.call(current, key)) {
        return defaultValue;
      }

      current = current[key];
    }

    return current;
  }

  /**
   * Normalize validation return values to { ok, errors }.
   * Useful inside ServiceManager when calling validateConfiguration().
   *
   * @param {boolean|{ok:boolean, errors:string[]}} result
   * @returns {{ok:boolean, errors:string[]}}
   */
  normalizeValidationResult(result) {
    if (typeof result === 'boolean') {
      return { ok: result, errors: result ? [] : ['Configuration validation failed'] };
    }

    if (result && typeof result === 'object') {
      return {
        ok: !!result.ok,
        errors: Array.isArray(result.errors) ? result.errors : []
      };
    }

    return { ok: true, errors: [] };
  }
}

module.exports = AbstractFactory;