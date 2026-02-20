const AbstractService = require('./abstract-service');

class AbstractActionService extends AbstractService {
  constructor() {
    if (new.target === AbstractActionService) {
      throw new TypeError('Cannot construct AbstractActionService instances directly');
    }
    super();
  }
}

module.exports = AbstractActionService;
