// library/mvc/service/factory/event-manager-factory.js
const AbstractFactory = require('../../service/abstract-factory');
const EventManager = require('../../../event/event-manager');

class EventManagerFactory extends AbstractFactory {
  createService() {
    return new EventManager();
  }
}

module.exports = EventManagerFactory;
