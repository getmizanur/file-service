const AbstractFactory = require('../abstract-factory');
const PluginManager = require('../../controller/plugin-manager');


class PluginManagerFactory extends AbstractFactory {

  /**
   * Create PluginManager service
   * Structure: global.nunjucksEnv.globals.__framework.PluginManager.configs
   * @param {ServiceManager} serviceManager - Service manager instance
   * @returns {PluginManager} PluginManager instance
   */
  createService(serviceManager) {
    // Always create new instance (configs stored in Container, not instance)
    const pluginManager = new PluginManager();

    // Pass configuration to plugin manager if available
    let appConfig = null;
    try {
      //const configRegistry = serviceManager.get('config');
      //appConfig = configRegistry.get('application');
      appConfig = serviceManager.get('Config');

      pluginManager.setConfig(appConfig);
    } catch (error) {
      console.warn('Could not load application config for plugin manager:', error.message);
    }

    // Get config from ServiceManager
    const config = serviceManager.get('Config');
    if(config && config.controller_plugins) {
      // Merge configs if needed
      const applicationPlugins = config.controller_plugins.invokables || {};

      // Merge framework plugins with application plugins (with conflict check)
      const mergedPlugins = this._mergePlugins(
        pluginManager.frameworkPlugins,
        applicationPlugins
      );

      // Configs are now managed by ServiceManager directly
      // No need to store in a separate container
    }

    return pluginManager;
  }

  /**
   * Merge framework plugins with application plugins
   * Throws error if application tries to override framework plugin
   * @private
   */
  _mergePlugins(frameworkPlugins, applicationPlugins) {
    // Check for conflicts
    const conflicts = Object.keys(applicationPlugins).filter(key =>
      frameworkPlugins.hasOwnProperty(key)
    );

    if(conflicts.length > 0) {
      throw new Error(
        `Application plugins cannot override framework plugins. ` +
        `The following keys are already in use by the framework: ${conflicts.join(', ')}. ` +
        `Please choose different names for your application plugins.`
      );
    }

    // Merge: framework plugins first, then application plugins
    return {
      ...frameworkPlugins,
      ...applicationPlugins
    };
  }

}

module.exports = PluginManagerFactory;