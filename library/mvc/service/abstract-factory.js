/**
 * Abstract Factory for Service Creation
 * All service factories must extend this abstract class
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
   * Check if this class implements AbstractFactory
   * @returns {boolean}
   */
  static implementsAbstractFactory() {
    return true;
  }

  /**
   * Get factory interface version for compatibility checking
   * @returns {string}
   */
  static getFactoryVersion() {
    return '1.0.0';
  }

  /**
   * Validate factory configuration before service creation
   * Override this method to add custom validation
   * @param {Object} config - Configuration object
   * @returns {boolean}
   */
  validateConfiguration(config) {
    return true;
  }

  /**
   * Get required configuration keys for this factory
   * Override this method to specify required config keys
   * @returns {Array} - Array of required config keys
   */
  getRequiredConfigKeys() {
    return [];
  }

  /**
   * Validate required configuration keys exist
   * @param {Object} config - Configuration object
   * @returns {boolean}
   */
  validateRequiredConfig(config) {
    const requiredKeys = this.getRequiredConfigKeys();

    for(const key of requiredKeys) {
      if(!this.hasNestedKey(config, key)) {
        console.error(`Missing required configuration key: ${key}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Check if nested key exists in configuration object
   * @param {Object} obj - Configuration object
   * @param {string} keyPath - Dot-separated key path (e.g., 'database.host')
   * @returns {boolean}
   */
  hasNestedKey(obj, keyPath) {
    const keys = keyPath.split('.');
    let current = obj;

    for(const key of keys) {
      if(current === null || current === undefined || !current.hasOwnProperty(key)) {
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
    const keys = keyPath.split('.');
    let current = obj;

    for(const key of keys) {
      if(current === null || current === undefined || !current.hasOwnProperty(key)) {
        return defaultValue;
      }
      current = current[key];
    }

    return current;
  }
}

module.exports = AbstractFactory;
