const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FolderService = require(path.join(projectRoot, 'application/service/domain/folder-domain-service'));
const AbstractDomainService = require(path.join(projectRoot, 'application/service/abstract-domain-service'));
const TableGateway = require(path.join(projectRoot, 'library/db/table-gateway'));

describe('FolderService', () => {
  let service;
  let mockTable;
  let mockSm;
  let mockQueryCacheService;
  let mockFolderEventTable;

  beforeEach(() => {
    service = new FolderService();
    mockTable = Object.create(TableGateway.prototype);
    mockTable.fetchByUserEmail = jest.fn().mockResolvedValue([]);
    mockTable.fetchByTenant = jest.fn().mockResolvedValue([]);
    mockTable.fetchByParent = jest.fn().mockResolvedValue([]);
    mockTable.fetchById = jest.fn().mockResolvedValue(null);
    mockTable.fetchRootByTenantId = jest.fn().mockResolvedValue(null);
    mockTable.create = jest.fn().mockResolvedValue('new-folder-id');
    mockTable.update = jest.fn().mockResolvedValue(true);
    mockTable.fetchDeletedFolders = jest.fn().mockResolvedValue([]);
    mockTable.fetchSearchResults = jest.fn().mockResolvedValue([]);
    mockTable.fetchByIdIncludeDeleted = jest.fn().mockResolvedValue(null);
    mockTable.isDescendantOf = jest.fn().mockResolvedValue(false);

    mockQueryCacheService = {
      onFolderChanged: jest.fn().mockReturnValue(Promise.resolve()),
    };

    mockFolderEventTable = {
      insertEvent: jest.fn().mockResolvedValue(true),
      fetchRecentByTenant: jest.fn().mockResolvedValue([]),
    };

    mockSm = {
      get: jest.fn((name) => {
        if (name === 'FolderTable') return mockTable;
        if (name === 'AppUserTable') return {
          resolveByEmail: jest.fn().mockResolvedValue({ user_id: 'u1', tenant_id: 't1' }),
        };
        if (name === 'QueryCacheService') return mockQueryCacheService;
        if (name === 'FolderEventTable') return mockFolderEventTable;
        if (name === 'FileMetadataTable') return { hasFilesByFolder: jest.fn().mockResolvedValue(false) };
        return mockTable;
      }),
    };
    service.setServiceManager(mockSm);
    service.table = {};
  });

  const makeFolder = (overrides = {}) => ({
    getTenantId: () => 't1',
    getFolderId: () => 'fold-1',
    getParentFolderId: () => 'parent-1',
    getName: () => 'TestFolder',
    getDeletedAt: () => null,
    getDeletedBy: () => null,
    ...overrides,
  });

  describe('constructor', () => {
    it('should be an instance of AbstractDomainService', () => {
      expect(service).toBeInstanceOf(AbstractDomainService);
    });
  });

  describe('simple delegations', () => {
    it('getFoldersByUserEmail', async () => {
      await service.getFoldersByUserEmail('email');
      expect(mockTable.fetchByUserEmail).toHaveBeenCalledWith('email');
    });

    it('getFoldersByTenant', async () => {
      await service.getFoldersByTenant('t1');
      expect(mockTable.fetchByTenant).toHaveBeenCalledWith('t1');
    });

    it('getTrashedFolders', async () => {
      await service.getTrashedFolders('email');
      expect(mockTable.fetchDeletedFolders).toHaveBeenCalledWith('email');
    });

    it('getFoldersByParent', async () => {
      await service.getFoldersByParent('p1', 't1', 'name');
      expect(mockTable.fetchByParent).toHaveBeenCalledWith('p1', 't1', 'name');
    });

    it('searchFolders', async () => {
      await service.searchFolders('t1', 'u1', 'term', 50);
      expect(mockTable.fetchSearchResults).toHaveBeenCalled();
    });

    it('getFolderById', async () => {
      await service.getFolderById('fold-1');
      expect(mockTable.fetchById).toHaveBeenCalledWith('fold-1');
    });
  });

  describe('getRecentFolders', () => {
    it('should resolve tenant and fetch recent', async () => {
      await service.getRecentFolders('email', 20);
      expect(mockFolderEventTable.fetchRecentByTenant).toHaveBeenCalledWith('t1', 20);
    });
  });

  describe('getFolderTreeByUserEmail', () => {
    it('should get folders and build tree', async () => {
      mockTable.fetchByUserEmail.mockResolvedValue([]);
      const result = await service.getFolderTreeByUserEmail('email');
      expect(result).toEqual([]);
    });
  });

  describe('getFolderTreeByTenant', () => {
    it('should get folders by tenant and build tree', async () => {
      mockTable.fetchByTenant.mockResolvedValue([]);
      const result = await service.getFolderTreeByTenant('t1');
      expect(result).toEqual([]);
    });
  });

  describe('buildFolderTree', () => {
    it('should return empty array for empty input', () => {
      expect(service.buildFolderTree([])).toEqual([]);
    });

    it('should build tree with entities', () => {
      const folders = [
        { folder_id: 'root', parent_folder_id: null, name: 'Root', getFolderId: () => 'root', getParentFolderId: () => null, toObject: () => ({ folder_id: 'root', parent_folder_id: null, name: 'Root' }) },
        { folder_id: 'child', parent_folder_id: 'root', name: 'Child', getFolderId: () => 'child', getParentFolderId: () => 'root', toObject: () => ({ folder_id: 'child', parent_folder_id: 'root', name: 'Child' }) },
      ];
      const tree = service.buildFolderTree(folders);
      expect(tree).toHaveLength(1);
      expect(tree[0].children).toHaveLength(1);
    });

    it('should handle plain objects', () => {
      const folders = [
        { folder_id: 'root', parent_folder_id: null, name: 'Root' },
        { folder_id: 'child', parent_folder_id: 'root', name: 'Child' },
      ];
      const tree = service.buildFolderTree(folders);
      expect(tree).toHaveLength(1);
      expect(tree[0].children).toHaveLength(1);
    });

    it('should handle orphan children', () => {
      const folders = [
        { folder_id: 'orphan', parent_folder_id: 'missing', name: 'Orphan' },
      ];
      const tree = service.buildFolderTree(folders);
      expect(tree).toHaveLength(1);
    });
  });

  describe('getRootFolderWithContext', () => {
    it('should return existing root folder', async () => {
      const root = { folder_id: 'root' };
      mockTable.fetchRootByTenantId.mockResolvedValue(root);
      const result = await service.getRootFolderWithContext('email');
      expect(result.rootFolder).toBe(root);
      expect(result.user_id).toBe('u1');
      expect(result.tenant_id).toBe('t1');
    });

    it('should create root folder if missing', async () => {
      mockTable.fetchRootByTenantId.mockResolvedValue(null);
      const newRoot = { folder_id: 'new-folder-id' };
      mockTable.fetchById.mockResolvedValue(newRoot);
      const result = await service.getRootFolderWithContext('email');
      expect(mockTable.create).toHaveBeenCalled();
      expect(result.rootFolder).toBe(newRoot);
    });
  });

  describe('createFolder', () => {
    it('should create folder with parent', async () => {
      const root = { getFolderId: () => 'root-id' };
      mockTable.fetchRootByTenantId.mockResolvedValue(root);

      const result = await service.createFolder('email', 'NewFolder', 'parent-id');
      expect(mockTable.create).toHaveBeenCalled();
      expect(result).toBe('new-folder-id');
    });

    it('should resolve root when parentFolderId is "root"', async () => {
      const root = { getFolderId: () => 'root-id' };
      mockTable.fetchRootByTenantId.mockResolvedValue(root);

      await service.createFolder('email', 'NewFolder', 'root');
      expect(mockTable.create).toHaveBeenCalledWith(expect.objectContaining({
        parent_folder_id: 'root-id',
      }));
    });

    it('should resolve root when parentFolderId is special UUID', async () => {
      const root = { getFolderId: () => 'root-id' };
      mockTable.fetchRootByTenantId.mockResolvedValue(root);

      await service.createFolder('email', 'Folder', 'a1000000-0000-0000-0000-000000000001');
      expect(mockTable.create).toHaveBeenCalledWith(expect.objectContaining({
        parent_folder_id: 'root-id',
      }));
    });

    it('should create root folder if none exists when resolving root', async () => {
      mockTable.fetchRootByTenantId.mockResolvedValue(null);
      // create returns the new root id for the first call, then new folder id for second
      mockTable.create
        .mockResolvedValueOnce('new-root-id')
        .mockResolvedValueOnce('child-id');

      await service.createFolder('email', 'Folder', null);
      expect(mockTable.create).toHaveBeenCalledTimes(2);
    });

    it('should return null when create fails', async () => {
      mockTable.create.mockResolvedValue(null);
      const result = await service.createFolder('email', 'Folder', 'parent-id');
      expect(result).toBeNull();
    });
  });

  describe('getRootFolderByUserEmail', () => {
    it('should return existing root', async () => {
      const root = { folder_id: 'root' };
      mockTable.fetchRootByTenantId.mockResolvedValue(root);
      const result = await service.getRootFolderByUserEmail('email');
      expect(result).toBe(root);
    });

    it('should create root if missing', async () => {
      mockTable.fetchRootByTenantId.mockResolvedValue(null);
      const newRoot = { folder_id: 'new-root' };
      mockTable.fetchById.mockResolvedValue(newRoot);
      const result = await service.getRootFolderByUserEmail('email');
      expect(result).toBe(newRoot);
    });
  });

  describe('deleteFolder', () => {
    it('should soft-delete a folder', async () => {
      const folder = makeFolder();
      mockTable.fetchById.mockResolvedValue(folder);

      const result = await service.deleteFolder('fold-1', 'email');
      expect(result).toBe(true);
      expect(mockTable.update).toHaveBeenCalled();
    });

    it('should throw if folder not found', async () => {
      await expect(service.deleteFolder('bad', 'email')).rejects.toThrow('Folder not found');
    });

    it('should throw if root folder', async () => {
      const folder = makeFolder({ getParentFolderId: () => null });
      mockTable.fetchById.mockResolvedValue(folder);
      await expect(service.deleteFolder('fold-1', 'email')).rejects.toThrow('Cannot delete root folder');
    });

    it('should throw if access denied', async () => {
      const folder = makeFolder({ getTenantId: () => 'other' });
      mockTable.fetchById.mockResolvedValue(folder);
      await expect(service.deleteFolder('fold-1', 'email')).rejects.toThrow('Access denied');
    });

    it('should throw if has sub-folders', async () => {
      const folder = makeFolder();
      mockTable.fetchById.mockResolvedValue(folder);
      mockTable.fetchByParent.mockResolvedValue([{ folder_id: 'sub' }]);
      await expect(service.deleteFolder('fold-1', 'email')).rejects.toThrow('contains sub-folders');
    });

    it('should throw if has files', async () => {
      const folder = makeFolder();
      mockTable.fetchById.mockResolvedValue(folder);
      mockSm.get.mockImplementation((name) => {
        if (name === 'FolderTable') return mockTable;
        if (name === 'AppUserTable') return { resolveByEmail: jest.fn().mockResolvedValue({ user_id: 'u1', tenant_id: 't1' }) };
        if (name === 'FileMetadataTable') return { hasFilesByFolder: jest.fn().mockResolvedValue(true) };
        if (name === 'QueryCacheService') return mockQueryCacheService;
        if (name === 'FolderEventTable') return mockFolderEventTable;
        return mockTable;
      });
      service.table = {};
      await expect(service.deleteFolder('fold-1', 'email')).rejects.toThrow('contains files');
    });
  });

  describe('updateFolder', () => {
    it('should rename folder', async () => {
      const folder = makeFolder();
      mockTable.fetchById.mockResolvedValue(folder);

      const result = await service.updateFolder('fold-1', 'NewName', 'email');
      expect(result).toBe(true);
    });

    it('should throw if folder not found', async () => {
      await expect(service.updateFolder('bad', 'Name', 'email')).rejects.toThrow('Folder not found');
    });

    it('should throw if access denied', async () => {
      const folder = makeFolder({ getTenantId: () => 'other' });
      mockTable.fetchById.mockResolvedValue(folder);
      await expect(service.updateFolder('fold-1', 'Name', 'email')).rejects.toThrow('Access denied');
    });
  });

  describe('moveFolder', () => {
    it('should move folder to new parent', async () => {
      const folder = makeFolder();
      const target = makeFolder({ getTenantId: () => 't1', getFolderId: () => 'target-id' });
      mockTable.fetchById
        .mockResolvedValueOnce(folder)
        .mockResolvedValueOnce(target);

      const result = await service.moveFolder('fold-1', 'target-id', 'email');
      expect(result).toBe(true);
    });

    it('should throw if folder not found', async () => {
      await expect(service.moveFolder('bad', 'target', 'email')).rejects.toThrow('Folder not found');
    });

    it('should throw if root folder', async () => {
      const folder = makeFolder({ getParentFolderId: () => null });
      mockTable.fetchById.mockResolvedValue(folder);
      await expect(service.moveFolder('fold-1', 'target', 'email')).rejects.toThrow('Cannot move root folder');
    });

    it('should throw if access denied', async () => {
      const folder = makeFolder({ getTenantId: () => 'other' });
      mockTable.fetchById.mockResolvedValue(folder);
      await expect(service.moveFolder('fold-1', 'target', 'email')).rejects.toThrow('Access denied');
    });

    it('should throw if target not found', async () => {
      const folder = makeFolder();
      mockTable.fetchById
        .mockResolvedValueOnce(folder)
        .mockResolvedValueOnce(null);
      await expect(service.moveFolder('fold-1', 'bad-target', 'email')).rejects.toThrow('Target parent folder not found');
    });

    it('should throw if target in different tenant', async () => {
      const folder = makeFolder();
      const target = makeFolder({ getTenantId: () => 'other' });
      mockTable.fetchById
        .mockResolvedValueOnce(folder)
        .mockResolvedValueOnce(target);
      await expect(service.moveFolder('fold-1', 'target', 'email')).rejects.toThrow('Access denied to target folder');
    });

    it('should throw if moving into itself', async () => {
      const folder = makeFolder({ getFolderId: () => 'same-id' });
      const target = makeFolder({ getFolderId: () => 'same-id' });
      mockTable.fetchById
        .mockResolvedValueOnce(folder)
        .mockResolvedValueOnce(target);
      await expect(service.moveFolder('same-id', 'same-id', 'email')).rejects.toThrow('Cannot move a folder into itself');
    });

    it('should throw if cyclic move', async () => {
      const folder = makeFolder();
      const target = makeFolder();
      mockTable.fetchById
        .mockResolvedValueOnce(folder)
        .mockResolvedValueOnce(target);
      mockTable.isDescendantOf.mockResolvedValue(true);
      await expect(service.moveFolder('fold-1', 'target', 'email')).rejects.toThrow('Cannot move a folder into one of its subfolders');
    });
  });

  describe('restoreFolder', () => {
    it('should restore a deleted folder', async () => {
      const folder = makeFolder({ getDeletedAt: () => new Date(), getDeletedBy: () => 'u1' });
      mockTable.fetchByIdIncludeDeleted.mockResolvedValue(folder);

      const result = await service.restoreFolder('fold-1', 'email');
      expect(result).toBe(true);
    });

    it('should throw if folder not found', async () => {
      await expect(service.restoreFolder('bad', 'email')).rejects.toThrow('Folder not found');
    });

    it('should throw if access denied', async () => {
      const folder = makeFolder({ getTenantId: () => 'other' });
      mockTable.fetchByIdIncludeDeleted.mockResolvedValue(folder);
      await expect(service.restoreFolder('fold-1', 'email')).rejects.toThrow('Access denied');
    });

    it('should throw if folder is not deleted', async () => {
      const folder = makeFolder({ getDeletedAt: () => null });
      mockTable.fetchByIdIncludeDeleted.mockResolvedValue(folder);
      await expect(service.restoreFolder('fold-1', 'email')).rejects.toThrow('Folder is not deleted');
    });
  });

  describe('logEvent', () => {
    it('should delegate to FolderEventTable', async () => {
      await service.logEvent('fold-1', 'CREATED', {}, 'u1');
      expect(mockFolderEventTable.insertEvent).toHaveBeenCalledWith('fold-1', 'CREATED', {}, 'u1');
    });
  });
});
