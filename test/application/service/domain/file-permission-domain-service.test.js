const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FilePermissionService = require(path.join(projectRoot, 'application/service/domain/file-permission-domain-service'));
const AbstractDomainService = require(path.join(projectRoot, 'application/service/abstract-domain-service'));
const TableGateway = require(path.join(projectRoot, 'library/db/table-gateway'));

describe('FilePermissionService', () => {
  let service;
  let mockTable;
  let mockSm;

  beforeEach(() => {
    service = new FilePermissionService();
    mockTable = Object.create(TableGateway.prototype);
    mockTable.upsertPermission = jest.fn().mockResolvedValue({ role: 'editor' });
    mockTable.deleteByFileAndUser = jest.fn().mockResolvedValue(true);
    mockTable.fetchPeopleWithAccess = jest.fn().mockResolvedValue([]);
    mockTable.fetchByUserAndFile = jest.fn().mockResolvedValue(null);
    mockSm = { get: jest.fn().mockReturnValue(mockTable) };
    service.setServiceManager(mockSm);
    service.table['FilePermissionTable'] = mockTable;
  });

  describe('constructor', () => {
    it('should be an instance of AbstractDomainService', () => {
      expect(service).toBeInstanceOf(AbstractDomainService);
    });
  });

  describe('grant', () => {
    it('should delegate to table.upsertPermission', async () => {
      await service.grant('t1', 'f1', 'u1', 'editor', 'u2');
      expect(mockTable.upsertPermission).toHaveBeenCalledWith('t1', 'f1', 'u1', 'editor', 'u2');
    });
  });

  describe('revoke', () => {
    it('should delegate to table.deleteByFileAndUser', async () => {
      await service.revoke('t1', 'f1', 'u1');
      expect(mockTable.deleteByFileAndUser).toHaveBeenCalledWith('t1', 'f1', 'u1');
    });
  });

  describe('getPeopleWithAccess', () => {
    it('should delegate to table.fetchPeopleWithAccess', async () => {
      await service.getPeopleWithAccess('t1', 'f1');
      expect(mockTable.fetchPeopleWithAccess).toHaveBeenCalledWith('t1', 'f1');
    });
  });

  describe('getUserPermission', () => {
    it('should delegate to table.fetchByUserAndFile', async () => {
      await service.getUserPermission('t1', 'f1', 'u1');
      expect(mockTable.fetchByUserAndFile).toHaveBeenCalledWith('t1', 'f1', 'u1');
    });
  });

  describe('hasAccess', () => {
    it('should return true when permission exists', async () => {
      mockTable.fetchByUserAndFile.mockResolvedValue({ role: 'viewer' });
      const result = await service.hasAccess('t1', 'f1', 'u1');
      expect(result).toBe(true);
    });

    it('should return false when no permission exists', async () => {
      mockTable.fetchByUserAndFile.mockResolvedValue(null);
      const result = await service.hasAccess('t1', 'f1', 'u1');
      expect(result).toBe(false);
    });
  });
});
