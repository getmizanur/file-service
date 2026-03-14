const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FolderShareLinkService = require(path.join(projectRoot, 'application/service/domain/folder-share-link-domain-service'));
const AbstractDomainService = require(path.join(projectRoot, 'application/service/abstract-domain-service'));
const TableGateway = require(path.join(projectRoot, 'library/db/table-gateway'));

describe('FolderShareLinkService', () => {
  let service;
  let mockTable;

  beforeEach(() => {
    service = new FolderShareLinkService();
    mockTable = Object.create(TableGateway.prototype);
    mockTable.insertLink = jest.fn().mockResolvedValue({});
    mockTable.revokeLink = jest.fn().mockResolvedValue(true);
    mockTable.deleteLink = jest.fn().mockResolvedValue(true);
    mockTable.fetchById = jest.fn().mockResolvedValue(null);
    mockTable.fetchByToken = jest.fn().mockResolvedValue(null);
    mockTable.fetchByFolderId = jest.fn().mockResolvedValue([]);
    mockTable.fetchByFolderWithDetails = jest.fn().mockResolvedValue([]);
    const mockSm = { get: jest.fn().mockReturnValue(mockTable) };
    service.setServiceManager(mockSm);
    service.table['FolderShareLinkTable'] = mockTable;
  });

  describe('constructor', () => {
    it('should be an instance of AbstractDomainService', () => {
      expect(service).toBeInstanceOf(AbstractDomainService);
    });
  });

  describe('create', () => {
    it('should delegate to table.insertLink', async () => {
      await service.create('t1', 'fold1', 'hash123', { createdBy: 'u1' });
      expect(mockTable.insertLink).toHaveBeenCalledWith('t1', 'fold1', 'hash123', { createdBy: 'u1' });
    });

    it('should use default empty options', async () => {
      await service.create('t1', 'fold1', 'hash123');
      expect(mockTable.insertLink).toHaveBeenCalledWith('t1', 'fold1', 'hash123', {});
    });

    it('should return the created link entity', async () => {
      const mockEntity = { share_id: 's1' };
      mockTable.insertLink.mockResolvedValue(mockEntity);
      const result = await service.create('t1', 'fold1', 'hash123');
      expect(result).toBe(mockEntity);
    });
  });

  describe('revoke', () => {
    it('should delegate to table.revokeLink', async () => {
      await service.revoke('t1', 'share-1');
      expect(mockTable.revokeLink).toHaveBeenCalledWith('t1', 'share-1');
    });
  });

  describe('delete', () => {
    it('should delegate to table.deleteLink', async () => {
      await service.delete('t1', 'share-1');
      expect(mockTable.deleteLink).toHaveBeenCalledWith('t1', 'share-1');
    });
  });

  describe('getById', () => {
    it('should delegate to table.fetchById', async () => {
      await service.getById('share-1');
      expect(mockTable.fetchById).toHaveBeenCalledWith('share-1');
    });
  });

  describe('getByToken', () => {
    it('should delegate to table.fetchByToken', async () => {
      await service.getByToken('hash123');
      expect(mockTable.fetchByToken).toHaveBeenCalledWith('hash123');
    });
  });

  describe('getByFolder', () => {
    it('should delegate to table.fetchByFolderId', async () => {
      await service.getByFolder('t1', 'fold1');
      expect(mockTable.fetchByFolderId).toHaveBeenCalledWith('t1', 'fold1');
    });
  });

  describe('getByFolderWithDetails', () => {
    it('should delegate to table.fetchByFolderWithDetails', async () => {
      await service.getByFolderWithDetails('t1', 'fold1');
      expect(mockTable.fetchByFolderWithDetails).toHaveBeenCalledWith('t1', 'fold1');
    });
  });

  describe('resolveActiveLink', () => {
    it('should return null when link not found', async () => {
      mockTable.fetchByToken.mockResolvedValue(null);
      const result = await service.resolveActiveLink('hash123');
      expect(result).toBeNull();
    });

    it('should return null when link is not active', async () => {
      mockTable.fetchByToken.mockResolvedValue({ isActive: () => false });
      const result = await service.resolveActiveLink('hash123');
      expect(result).toBeNull();
    });

    it('should return the link when active', async () => {
      const mockLink = { isActive: () => true, share_id: 's1' };
      mockTable.fetchByToken.mockResolvedValue(mockLink);
      const result = await service.resolveActiveLink('hash123');
      expect(result).toBe(mockLink);
    });
  });
});
