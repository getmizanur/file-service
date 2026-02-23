// library/mvc/service/factory/plugin-manager-factory.js
const AbstractFactory = require('../abstract-factory');
const PluginManager = require('../../controller/plugin-manager');

class PluginManagerFactory extends AbstractFactory {

  /**
   * Create PluginManager service
   * @param {ServiceManager} serviceManager
   * @returns {PluginManager}
   */
  createService(serviceManager) {
    if (!serviceManager || typeof serviceManager.get !== 'function') {
      throw new Error('PluginManagerFactory: serviceManager is required');
    }

    const pluginManager = new PluginManager();

    // Load config once (defensively)
    let config = {};
    try {
      config = serviceManager.get('Config') || {};
    } catch (e) {
      config = {};
    }

    // Give the plugin manager access to config (existing behaviour)
    if (typeof pluginManager.setConfig === 'function') {
      pluginManager.setConfig(config);
    }

    // Merge framework + application plugins with conflict checks
    const controllerPluginsCfg =
      (config.controller_plugins && typeof config.controller_plugins === 'object')
        ? config.controller_plugins
        : {};

    const applicationPlugins =
      (controllerPluginsCfg.invokables && typeof controllerPluginsCfg.invokables === 'object')
        ? controllerPluginsCfg.invokables
        : {};

    const frameworkPlugins =
      (pluginManager.frameworkPlugins && typeof pluginManager.frameworkPlugins === 'object')
        ? pluginManager.frameworkPlugins
        : {};

    const mergedPlugins = this._mergePlugins(frameworkPlugins, applicationPlugins);

    /**
     * Wire merged plugin map into PluginManager if it supports it.
     * This is non-breaking: if your current PluginManager doesn't implement it,
     * nothing bad happens, but you won't get config-driven plugins until you add it.
     */
    if (typeof pluginManager.setApplicationPlugins === 'function') {
      pluginManager.setApplicationPlugins(mergedPlugins);
    } else if (typeof pluginManager.setPlugins === 'function') {
      // alternate naming (if you already have it)
      pluginManager.setPlugins(mergedPlugins);
    } else {
      // As a last resort, attach on a known property name (still non-breaking)
      pluginManager.plugins = mergedPlugins;
    }

    return pluginManager;
  }

  /**
   * Merge framework plugins with application plugins
   * Throws error if application tries to override a framework plugin
   * @private
   */
  _mergePlugins(frameworkPlugins, applicationPlugins) {
    const conflicts = Object.keys(applicationPlugins).filter(key =>
      Object.prototype.hasOwnProperty.call(frameworkPlugins, key)
    );

    if (conflicts.length > 0) {
      throw new Error(
        `Application plugins cannot override framework plugins. ` +
        `The following keys are already in use by the framework: ${conflicts.join(', ')}. ` +
        `Please choose different names for your application plugins.`
      );
    }

    return {
      ...frameworkPlugins,
      ...applicationPlugins
    };
  }
}

module.exports = PluginManagerFactory;