const AbstractViewHelperFactory = require('../../abstract-view-helper-factory');
const ParamsHelper = require('../params');

class ParamsFactory extends AbstractViewHelperFactory {

  createService(serviceManager) {
    const helper = new ParamsHelper();

    // Inject Request from Application service
    if (serviceManager.has('Application')) {
      const application = serviceManager.get('Application');
      const request = application.getRequest();
      if (request) {
        helper.setRequest(request);
      }
    }

    return helper;
  }

}

module.exports = ParamsFactory;
