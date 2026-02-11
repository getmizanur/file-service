const AbstractFactory = require('../abstract-factory');
const ViewHelperManager = require('../../view/view-helper-manager');

class ViewHelperManagerFactory extends AbstractFactory {

  /**
   * Create ViewHelperManager service
   * @param {ServiceManager} serviceManager - Service manager instance
   * @returns {ViewHelperManager} ViewHelperManager instance
   */
  createService(serviceManager) {
    let applicationHelpersConfig = {
      invokables: {},
      factories: {}
    };

    try {
      const appConfig = serviceManager.get('Config');

      // Get invokables and factories from view_helpers config
      if(appConfig.view_helpers) {
        if(appConfig.view_helpers.invokables) {
          applicationHelpersConfig.invokables = appConfig.view_helpers.invokables;
        }
        if(appConfig.view_helpers.factories) {
          applicationHelpersConfig.factories = appConfig.view_helpers.factories;
        }
      }
    } catch (error) {
      console.warn('Could not load view_helpers config:', error.message);
    }

    // ViewHelperManager constructor handles conflict checking
    const viewHelperManager = new ViewHelperManager(applicationHelpersConfig, serviceManager);

    return viewHelperManager;
  }

}

module.exports = ViewHelperManagerFactory;