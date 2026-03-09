// library/mvc/view/helper/factory/url-factory.js
const AbstractViewHelperFactory = require('../../abstract-view-helper-factory');
const UrlHelper = require('../url');

class UrlFactory extends AbstractViewHelperFactory {

  createService(serviceManager) {
    const helper = new UrlHelper();

    // Optional: give helper access to the ServiceManager (for Config lookups, etc.)
    if (typeof helper.setServiceManager === 'function') {
      helper.setServiceManager(serviceManager);
    }

    // Optional: allow config-driven behaviour (no hard dependency)
    // Example config:
    // view_manager: { url_helper: { debug: true } }
    try {
      const config = serviceManager && typeof serviceManager.get === 'function'
        ? serviceManager.get('Config')
        : null;

      const urlCfg = config?.view_manager?.url_helper ?? null;

      if (urlCfg && typeof urlCfg === 'object') {
        if (Object.hasOwn(urlCfg, 'debug') && typeof helper.setDebug === 'function') {
          helper.setDebug(!!urlCfg.debug);
        }

        // If you later add helper.setRoutes(routes) you can wire it here too:
        // if (urlCfg.routes && typeof helper.setRoutes === 'function') helper.setRoutes(urlCfg.routes);
      }
    } catch {
      // Intentionally ignored - Config service not available; URL helper works with defaults
    }

    return helper;
  }

}

module.exports = UrlFactory;