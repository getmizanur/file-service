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
    const mockAdapter = { query: jest.fn() };

    beforeEach(() => {
      service = new ConcreteDomainService();
      service.setServiceManager({ get: jest.fn().mockReturnValue(mockAdapter) });
    });

    it('should throw TypeError when name is not provided', () => {
      expect(() => service.getTable()).toThrow(TypeError);
      expect(() => service.getTable()).toThrow('getTable: name must be a non-empty string');
    });

    it('should throw TypeError when name is empty string', () => {
      expect(() => service.getTable('')).toThrow(TypeError);
      expect(() => service.getTable('')).toThrow('getTable: name must be a non-empty string');
    });

    it('should throw TypeError when name is not a string', () => {
      expect(() => service.getTable(123)).toThrow(TypeError);
      expect(() => service.getTable(null)).toThrow(TypeError);
      expect(() => service.getTable({})).toThrow(TypeError);
    });

    it('should throw Error when serviceManager has not been set', () => {
      service.serviceManager = null;
      expect(() => service.getTable('FolderTable')).toThrow(Error);
      expect(() => service.getTable('FolderTable')).toThrow('getTable: ServiceManager has not been set');
    });

    it('should return a TableGateway instance for a real table', () => {
      const result = service.getTable('FolderTable');
      expect(result).toBeInstanceOf(TableGateway);
    });

    it('should cache the table after first retrieval', () => {
      const first = service.getTable('FolderTable');
      const second = service.getTable('FolderTable');
      expect(first).toBe(second);
    });

    it('should retrieve different tables by name', () => {
      const folder = service.getTable('FolderTable');
      const file = service.getTable('FileMetadataTable');
      expect(folder).toBeInstanceOf(TableGateway);
      expect(file).toBeInstanceOf(TableGateway);
      expect(folder).not.toBe(file);
    });

    it('should throw when table module does not exist', () => {
      expect(() => service.getTable('NonExistentTable')).toThrow();
    });

    it('should pass DbAdapter from serviceManager to table constructor', () => {
      const result = service.getTable('FolderTable');
      expect(service.serviceManager.get).toHaveBeenCalledWith('DbAdapter');
      expect(result.adapter).toBe(mockAdapter);
    });
  });
});
