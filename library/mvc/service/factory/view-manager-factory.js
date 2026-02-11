const AbstractFactory = require('../abstract-factory');
const ViewManager = require('../../view/view-manager');


class ViewManagerFactory extends AbstractFactory {

  /**
   * Create ViewManager service
   * Structure: global.nunjucksEnv.globals.__framework.ViewManager.configs
   * @param {ServiceManager} serviceManager - Service manager instance
   * @returns {ViewManager} ViewManager instance
   */
  createService(serviceManager) {
    // Always create new instance (configs stored in Container, not instance)
    let viewManagerConfig = {};
    let appConfig = {};

    try {
      const configRegistry = serviceManager.get('Config');
      appConfig = configRegistry; // Config is now a plain object, not a registry
      viewManagerConfig = appConfig.application?.view_manager || {};
    } catch (error) {
      console.warn('Could not load application config for view manager:', error.message);
    }

    const viewManager = new ViewManager(viewManagerConfig);

    // Get config from ServiceManager
    const config = serviceManager.get('Config');
    if(config && config.view_manager) {
      // Merge configs if needed, or just rely on what's passed
      // In this architecture, we assume config is already merged in ServiceManager
    }

    return viewManager;
  }

}

module.exports = ViewManagerFactory;
