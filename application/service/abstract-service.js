// application/service/abstract-service.js
class AbstractService {
  constructor() {
    if(new.target === AbstractService) {
      throw new TypeError("Cannot construct AbstractService instances directly");
    }

    this.cache = {};
    this.config = null;
    this.serviceManager = null;
  }

  loadApplicationConfig() {
    if(!this.config) {
      this.config = require('../config/application.config.js');
    }
    return this.config;
  }

  /**
   * Get cache instance for specified type
   * Handles both typed (transient/persistent) and single backend configurations
   * @param {string} type - Cache type: 'transient', 'persistent', or 'default'
   * @returns {Cache} Cache instance
   */
  getCache(type = 'default') {
    // Return existing cache instance if already created
    if(this.cache[type]) {
      return this.cache[type];
    }

    // Load application configuration
    const config = this.loadApplicationConfig();
    const cacheConfig = config.cache;

    // Check if cache is enabled
    if(!cacheConfig.enabled) {
      console.warn('Cache is disabled in configuration');
      return null;
    }

    let backendOptions;
    let frontendOptions = {
      ...cacheConfig.frontend_options
    };

    // Determine configuration structure and get appropriate options
    if(this.hasTypedBackendOptions(cacheConfig)) {
      // Case 1: Typed backend options (persistent/transient structure)
      if(!['transient', 'persistent'].includes(type)) {
        throw new Error(`Invalid cache type '${type}'. With typed configuration, must be 'transient' or 'persistent'.`);
      }

      backendOptions = cacheConfig.backend_options[type];
      if(!backendOptions) {
        throw new Error(`Cache backend options not found for type '${type}'`);
      }

      // Override TTL from backend options if available
      if(backendOptions.server?.ttl) {
        frontendOptions.lifetime = backendOptions.server.ttl;
      }
    } else {
      // Case 2: Single backend configuration (no persistent/transient subdivision)
      if(type !== 'default' && !['transient', 'persistent'].includes(type)) {
        throw new Error(`Invalid cache type '${type}'. With single configuration, use 'default' or let method default.`);
      }

      // For single config, all types use the same backend options
      backendOptions = {
        ...cacheConfig.backend_options
      };

      // Optionally, you could still differentiate by modifying TTL or prefix
      if(type === 'transient') {
        // Shorter TTL for transient even with single config
        frontendOptions.lifetime = Math.floor(frontendOptions.lifetime / 2);
        backendOptions.key_prefix = (backendOptions.key_prefix || 'myapp_') + 'transient_';
      } else if(type === 'persistent') {
        // Longer TTL for persistent
        frontendOptions.lifetime = frontendOptions.lifetime * 2;
        backendOptions.key_prefix = (backendOptions.key_prefix || 'myapp_') + 'persistent_';
      }
      // For 'default', use config as-is
    }

    // Create cache instance
    const Cache = require(global.applicationPath('/library/cache/cache'));
    this.cache[type] = Cache.factory(
      cacheConfig.frontend,
      cacheConfig.backend,
      frontendOptions,
      backendOptions
    );

    return this.cache[type];
  }

  /**
   * Check if backend options are typed (have persistent/transient structure)
   * @param {Object} cacheConfig - Cache configuration
   * @returns {boolean} True if typed backend options exist
   */
  hasTypedBackendOptions(cacheConfig) {
    const backendOptions = cacheConfig.backend_options;

    // Check if backend_options has persistent or transient properties
    return backendOptions &&
      (backendOptions.hasOwnProperty('persistent') ||
        backendOptions.hasOwnProperty('transient'));
  }

  /**
   * Get available cache types based on configuration
   * @returns {Array} Array of available cache types
   */
  getAvailableCacheTypes() {
    const config = this.loadApplicationConfig();
    const cacheConfig = config.cache;

    if(!cacheConfig?.enabled) {
      return [];
    }

    if(this.hasTypedBackendOptions(cacheConfig)) {
      // Return only the types that are actually configured
      const types = [];
      if(cacheConfig.backend_options.persistent) types.push('persistent');
      if(cacheConfig.backend_options.transient) types.push('transient');
      return types;
    } else {
      // Single configuration supports all types via modification
      return ['default', 'transient', 'persistent'];
    }
  }

  /**
   * Set a specific cache instance (for testing or manual setup)
   * @param {string} type - Cache type: 'transient', 'persistent', or 'default'
   * @param {Cache} cacheInstance - Cache instance to set
   * @returns {AbstractService} This instance for chaining
   */
  setCache(type, cacheInstance) {
    this.cache[type] = cacheInstance;
    return this;
  }

  /**
   * Clear all cache instances
   * @returns {AbstractService} This instance for chaining
   */
  clearCaches() {
    this.cache = {};
    return this;
  }

  /**
   * Check if cache type is available
   * @param {string} type - Cache type to check
   * @returns {boolean} True if cache is available
   */
  hasCacheType(type) {
    const config = this.loadApplicationConfig();
    return config.cache?.enabled &&
      this.getAvailableCacheTypes().includes(type);
  }

  /**
   * Get the ServiceManager instance
   * @returns {Object|null} ServiceManager instance
   */
  getServiceManager() {
    return this.serviceManager;
  }

  /**
   * Set the ServiceManager instance
   * @param {Object} serviceManager - ServiceManager instance
   * @returns {AbstractService} This instance for chaining
   */
  setServiceManager(serviceManager) {
    this.serviceManager = serviceManager;
    return this;
  }

}

module.exports = AbstractService;