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

    // setConfig() merges framework + application plugins into invokableClasses
    // via PluginManager.getAllPlugins() — no additional wiring needed
    if (typeof pluginManager.setConfig === 'function') {
      pluginManager.setConfig(config);
    }

    return pluginManager;
  }
}

module.exports = PluginManagerFactory;