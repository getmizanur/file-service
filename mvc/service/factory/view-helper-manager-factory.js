// library/mvc/service/factory/view-helper-manager-factory.js
const AbstractFactory = require('../abstract-factory');
const ViewHelperManager = require('../../view/view-helper-manager');

class ViewHelperManagerFactory extends AbstractFactory {

  /**
   * Create ViewHelperManager service
   * @param {ServiceManager} serviceManager - Service manager instance
   * @returns {ViewHelperManager}
   */
  createService(serviceManager) {
    if (!serviceManager || typeof serviceManager.get !== 'function') {
      throw new Error('ViewHelperManagerFactory: serviceManager is required');
    }

    // Default empty application helper config
    const applicationHelpersConfig = {
      invokables: {},
      factories: {}
    };

    // Load config safely
    let appConfig = {};
    try {
      appConfig = serviceManager.get('Config') || {};
    } catch (e) {
      appConfig = {};
    }

    // Extract view_helpers config (if present)
    const viewHelpersCfg =
      (appConfig.view_helpers && typeof appConfig.view_helpers === 'object')
        ? appConfig.view_helpers
        : null;

    if (viewHelpersCfg) {
      if (viewHelpersCfg.invokables && typeof viewHelpersCfg.invokables === 'object') {
        applicationHelpersConfig.invokables = viewHelpersCfg.invokables;
      }
      if (viewHelpersCfg.factories && typeof viewHelpersCfg.factories === 'object') {
        applicationHelpersConfig.factories = viewHelpersCfg.factories;
      }
    }

    // ViewHelperManager constructor handles conflict checking
    return new ViewHelperManager(applicationHelpersConfig, serviceManager);
  }

}

module.exports = ViewHelperManagerFactory;