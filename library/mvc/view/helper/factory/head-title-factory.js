const AbstractViewHelperFactory = require('../../abstract-view-helper-factory');
const HeadTitleHelper = require('../head-title');

class HeadTitleFactory extends AbstractViewHelperFactory {

  createService(serviceManager) {
    const helper = new HeadTitleHelper();
    if(typeof helper.setServiceManager === 'function') {
      helper.setServiceManager(serviceManager);
    }
    return helper;
  }

}

module.exports = HeadTitleFactory;
