const AbstractViewHelperFactory = require('../../abstract-view-helper-factory');
const UrlHelper = require('../url');

class UrlFactory extends AbstractViewHelperFactory {

  createService(serviceManager) {
    const helper = new UrlHelper();
    if(typeof helper.setServiceManager === 'function') {
      helper.setServiceManager(serviceManager);
    }
    return helper;
  }

}

module.exports = UrlFactory;