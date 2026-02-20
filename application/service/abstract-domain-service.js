const AbstractService = require('./abstract-service');
const TableGateway = require('../../library/db/table-gateway.js');

class AbstractDomainService extends AbstractService {
  constructor() {
    if (new.target === AbstractDomainService) {
      throw new TypeError('Cannot construct AbstractDomainService instances directly');
    }
    super();
    this.table = {};
  }

  getTable(name) {
    if (!name || typeof name !== 'string') {
      throw new TypeError('getTable: name must be a non-empty string');
    }

    if (!this.serviceManager) {
      throw new Error('getTable: ServiceManager has not been set');
    }

    if (!this.table.hasOwnProperty(name)) {
      const tbl = this.serviceManager.get(name);

      if (tbl === null || tbl === undefined) {
        throw new Error(`getTable: '${name}' is not registered in the ServiceManager`);
      }

      if (!(tbl instanceof TableGateway)) {
        throw new TypeError(`getTable: '${name}' is not a TableGateway instance`);
      }

      this.table[name] = tbl;
    }

    return this.table[name];
  }
}

module.exports = AbstractDomainService;
