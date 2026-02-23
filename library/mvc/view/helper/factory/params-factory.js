// library/mvc/view/helper/factory/params-factory.js
const AbstractViewHelperFactory = require('../../abstract-view-helper-factory');
const ParamsHelper = require('../params');

class ParamsFactory extends AbstractViewHelperFactory {

  createService(serviceManager) {
    const helper = new ParamsHelper();

    // Optional: keep SM reference (useful for debugging or future expansion)
    if (typeof helper.setServiceManager === 'function') {
      helper.setServiceManager(serviceManager);
    }

    /**
     * Backwards-compatible fallback only:
     * - If Application already has a request at factory time, set it.
     * - But with the updated architecture, the preferred path is:
     *     ViewHelperManager.setContext(ctx)
     *   and ParamsHelper will resolve ctx.request/ctx.req per render.
     *
     * If your ViewHelperManager caches helpers across requests,
     * DO NOT rely on this for correctness; context should supply the request.
     */
    try {
      if (serviceManager && typeof serviceManager.has === 'function' && serviceManager.has('Application')) {
        const application = serviceManager.get('Application');
        const request = application && typeof application.getRequest === 'function'
          ? application.getRequest()
          : null;

        if (request && typeof helper.setRequest === 'function') {
          helper.setRequest(request);
        }
      }
    } catch (e) {
      // Ignore missing Application service or missing request
    }

    return helper;
  }

}

module.exports = ParamsFactory;