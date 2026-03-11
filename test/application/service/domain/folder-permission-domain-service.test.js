const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FolderPermissionService = require(path.join(projectRoot, 'application/service/domain/folder-permission-domain-service'));
const AbstractDomainService = require(path.join(projectRoot, 'application/service/abstract-domain-service'));
const TableGateway = require(path.join(projectRoot, 'library/db/table-gateway'));

describe('FolderPermissionService', () => {
  let service;
  let mockTable;

  beforeEach(() => {
    service = new FolderPermissionService();
    mockTable = Object.create(TableGateway.prototype);
    mockTable.upsertPermission = jest.fn().mockResolvedValue({});
    mockTable.deletePermission = jest.fn().mockResolvedValue(true);
    mockTable.fetchPeopleWithAccess = jest.fn().mockResolvedValue([]);
    mockTable.fetchByUserAndFolder = jest.fn().mockResolvedValue(null);
    const mockSm = { get: jest.fn().mockReturnValue(mockTable) };
    service.setServiceManager(mockSm);
  });

  describe('constructor', () => {
    it('should be an instance of AbstractDomainService', () => {
      expect(service).toBeInstanceOf(AbstractDomainService);
    });
  });

  describe('grant', () => {
    it('should delegate to table.upsertPermission', async () => {
      await service.grant('t1', 'fold1', 'u1', 'editor', 'u2');
      expect(mockTable.upsertPermission).toHaveBeenCalledWith('t1', 'fold1', 'u1', 'editor', 'u2', true);
    });

    it('should pass inheritToChildren parameter', async () => {
      await service.grant('t1', 'fold1', 'u1', 'viewer', 'u2', false);
      expect(mockTable.upsertPermission).toHaveBeenCalledWith('t1', 'fold1', 'u1', 'viewer', 'u2', false);
    });
  });

  describe('revoke', () => {
    it('should delegate to table.deletePermission', async () => {
      await service.revoke('t1', 'fold1', 'u1');
      expect(mockTable.deletePermission).toHaveBeenCalledWith('t1', 'fold1', 'u1');
    });
  });

  describe('getPeopleWithAccess', () => {
    it('should delegate to table.fetchPeopleWithAccess', async () => {
      await service.getPeopleWithAccess('t1', 'fold1');
      expect(mockTable.fetchPeopleWithAccess).toHaveBeenCalledWith('t1', 'fold1');
    });
  });

  describe('getUserPermission', () => {
    it('should delegate to table.fetchByUserAndFolder', async () => {
      await service.getUserPermission('t1', 'fold1', 'u1');
      expect(mockTable.fetchByUserAndFolder).toHaveBeenCalledWith('t1', 'fold1', 'u1');
    });
  });

  describe('canEdit', () => {
    it('should return true when permission allows editing', async () => {
      mockTable.fetchByUserAndFolder.mockResolvedValue({ canEdit: () => true });
      const result = await service.canEdit('t1', 'fold1', 'u1');
      expect(result).toBe(true);
    });

    it('should return false when permission does not allow editing', async () => {
      mockTable.fetchByUserAndFolder.mockResolvedValue({ canEdit: () => false });
      const result = await service.canEdit('t1', 'fold1', 'u1');
      expect(result).toBe(false);
    });

    it('should return false when no permission exists', async () => {
      mockTable.fetchByUserAndFolder.mockResolvedValue(null);
      const result = await service.canEdit('t1', 'fold1', 'u1');
      expect(result).toBe(false);
    });
  });
});
