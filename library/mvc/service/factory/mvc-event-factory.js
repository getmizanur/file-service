// library/mvc/service/factory/mvc-event-factory.js
const MvcEvent = require('../../mvc-event');

module.exports = class MvcEventFactory {
  createService(serviceManager) {
    // Per-request scope should cache this instance.
    // We attach the request-scoped service manager for convenience.
    return new MvcEvent().setServiceManager(serviceManager);
  }
};
