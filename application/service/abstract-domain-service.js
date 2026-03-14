// application/service/abstract-domain-service.js
const AbstractService = require('./abstract-service');

class AbstractDomainService extends AbstractService {

  constructor() {
    if (new.target === AbstractDomainService) {
      throw new TypeError('Cannot construct AbstractDomainService instances directly');
    }
    super();
  }
}

module.exports = AbstractDomainService;
