const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const AbstractDomainService = require(path.join(projectRoot, 'application/service/abstract-domain-service'));
const AbstractService = require(path.join(projectRoot, 'application/service/abstract-service'));
const TableGateway = require(path.join(projectRoot, 'library/db/table-gateway'));

class ConcreteDomainService extends AbstractDomainService {
  constructor() {
    super();
  }
}

describe('AbstractDomainService', () => {

  describe('constructor', () => {
    it('should throw TypeError when instantiated directly', () => {
      expect(() => new AbstractDomainService()).toThrow(TypeError);
      expect(() => new AbstractDomainService()).toThrow('Cannot construct AbstractDomainService instances directly');
    });

    it('should allow instantiation through a concrete subclass', () => {
      const service = new ConcreteDomainService();
      expect(service).toBeInstanceOf(AbstractDomainService);
      expect(service).toBeInstanceOf(AbstractService);
    });

    it('should initialize table as empty object', () => {
      const service = new ConcreteDomainService();
      expect(service.table).toEqual({});
    });
  });

  describe('getTable', () => {
    let service;

    beforeEach(() => {
      service = new ConcreteDomainService();
    });

    it('should throw TypeError when name is not provided', () => {
      service.setServiceManager({ get: jest.fn() });
      expect(() => service.getTable()).toThrow(TypeError);
      expect(() => service.getTable()).toThrow('getTable: name must be a non-empty string');
    });

    it('should throw TypeError when name is empty string', () => {
      service.setServiceManager({ get: jest.fn() });
      expect(() => service.getTable('')).toThrow(TypeError);
      expect(() => service.getTable('')).toThrow('getTable: name must be a non-empty string');
    });

    it('should throw TypeError when name is not a string', () => {
      service.setServiceManager({ get: jest.fn() });
      expect(() => service.getTable(123)).toThrow(TypeError);
      expect(() => service.getTable(null)).toThrow(TypeError);
      expect(() => service.getTable({})).toThrow(TypeError);
    });

    it('should throw Error when serviceManager has not been set', () => {
      expect(() => service.getTable('TestTable')).toThrow(Error);
      expect(() => service.getTable('TestTable')).toThrow('getTable: ServiceManager has not been set');
    });

    it('should throw Error when name is not registered in the ServiceManager', () => {
      const mockSm = { get: jest.fn().mockReturnValue(null) };
      service.setServiceManager(mockSm);
      expect(() => service.getTable('UnknownTable')).toThrow(Error);
      expect(() => service.getTable('UnknownTable')).toThrow("getTable: 'UnknownTable' is not registered in the ServiceManager");
    });

    it('should throw Error when returned value is undefined', () => {
      const mockSm = { get: jest.fn().mockReturnValue(undefined) };
      service.setServiceManager(mockSm);
      expect(() => service.getTable('UndefinedTable')).toThrow("getTable: 'UndefinedTable' is not registered in the ServiceManager");
    });

    it('should throw TypeError when registered service is not a TableGateway instance', () => {
      const notATableGateway = { query: jest.fn() };
      const mockSm = { get: jest.fn().mockReturnValue(notATableGateway) };
      service.setServiceManager(mockSm);
      expect(() => service.getTable('NotATable')).toThrow(TypeError);
      expect(() => service.getTable('NotATable')).toThrow("getTable: 'NotATable' is not a TableGateway instance");
    });

    it('should return a TableGateway instance when properly registered', () => {
      const mockTableGateway = Object.create(TableGateway.prototype);
      const mockSm = { get: jest.fn().mockReturnValue(mockTableGateway) };
      service.setServiceManager(mockSm);
      const result = service.getTable('TestTable');
      expect(result).toBe(mockTableGateway);
    });

    it('should cache the table after first retrieval', () => {
      const mockTableGateway = Object.create(TableGateway.prototype);
      const mockSm = { get: jest.fn().mockReturnValue(mockTableGateway) };
      service.setServiceManager(mockSm);
      service.getTable('TestTable');
      service.getTable('TestTable');
      expect(mockSm.get).toHaveBeenCalledTimes(1);
    });

    it('should retrieve different tables by name', () => {
      const table1 = Object.create(TableGateway.prototype);
      const table2 = Object.create(TableGateway.prototype);
      const mockSm = {
        get: jest.fn((name) => {
          if (name === 'Table1') return table1;
          if (name === 'Table2') return table2;
          return null;
        })
      };
      service.setServiceManager(mockSm);
      expect(service.getTable('Table1')).toBe(table1);
      expect(service.getTable('Table2')).toBe(table2);
    });
  });
});
