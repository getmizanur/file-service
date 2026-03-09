// library/mvc/view/helper/factory/head-title-factory.js
const AbstractViewHelperFactory = require('../../abstract-view-helper-factory');
const HeadTitleHelper = require('../head-title');

class HeadTitleFactory extends AbstractViewHelperFactory {

  createService(serviceManager) {
    const helper = new HeadTitleHelper();

    // Optional: allow helper to access SM (legacy compatibility)
    if (typeof helper.setServiceManager === 'function') {
      helper.setServiceManager(serviceManager);
    }

    // Optional: apply config defaults if provided
    // e.g. config.view_manager.head_title = { separator: ' | ', default_title: '...' }
    try {
      const config = serviceManager && typeof serviceManager.get === 'function'
        ? serviceManager.get('Config')
        : null;

      const headTitleCfg = config?.view_manager?.head_title ?? null;

      if (headTitleCfg) {
        if (headTitleCfg.separator && typeof helper.setSeparator === 'function') {
          helper.setSeparator(headTitleCfg.separator);
        }
        if (headTitleCfg.default_title && typeof helper.setDefaultTitle === 'function') {
          helper.setDefaultTitle(headTitleCfg.default_title);
        }
      }
    } catch (error_) {
      // Intentionally ignored - Config service or head_title config not available; use helper defaults
    }

    return helper;
  }

}

module.exports = HeadTitleFactory;