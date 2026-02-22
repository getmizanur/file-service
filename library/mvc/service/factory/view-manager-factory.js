const AbstractFactory = require('../abstract-factory');
const ViewManager = require('../../view/view-manager');

class ViewManagerFactory extends AbstractFactory {

  /**
   * Create ViewManager service
   * @param {ServiceManager} serviceManager
   * @returns {ViewManager}
   */
  createService(serviceManager) {
    if (!serviceManager || typeof serviceManager.get !== 'function') {
      throw new Error('ViewManagerFactory: serviceManager is required');
    }

    // Load config once (defensively)
    let config = {};
    try {
      config = serviceManager.get('Config') || {};
    } catch (e) {
      config = {};
    }

    // Prefer the conventional top-level key: config.view_manager
    // Fallback to config.application.view_manager for legacy layouts.
    const viewManagerConfig =
      (config.view_manager && typeof config.view_manager === 'object')
        ? config.view_manager
        : ((config.application && config.application.view_manager && typeof config.application.view_manager === 'object')
          ? config.application.view_manager
          : {});

    return new ViewManager(viewManagerConfig);
  }
}

module.exports = ViewManagerFactory;