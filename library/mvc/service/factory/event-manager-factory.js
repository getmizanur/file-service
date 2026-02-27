// library/mvc/service/factory/event-manager-factory.js
const EventManager = require('../../../event-manager/event-manager');

module.exports = class EventManagerFactory {
  createService(serviceManager) {
    return new EventManager();
  }
};
