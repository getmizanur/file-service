const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FolderActionService = require(path.join(projectRoot, 'application/service/action/folder-action-service'));
const AbstractActionService = require(path.join(projectRoot, 'application/service/abstract-action-service'));

describe('FolderActionService', () => {
  let service;
  let mockSm;
  let mockFolderService;
  let mockStorageService;
  let mockFileMetadataService;
  let mockFolderTable;
  let mockAppUserTable;

  beforeEach(() => {
    service = new FolderActionService();

    mockFolderTable = {
      fetchByIdIncludeDeleted: jest.fn(),
    };

    mockFolderService = {
      getFolderById: jest.fn(),
      createFolder: jest.fn(),
      deleteFolder: jest.fn(),
      getRootFolderByUserEmail: jest.fn(),
      restoreFolder: jest.fn(),
      moveFolder: jest.fn(),
      getTable: jest.fn().mockReturnValue(mockFolderTable),
    };

    mockStorageService = {
      getBackend: jest.fn(),
      read: jest.fn(),
    };

    const mockFileTable = {
      fetchAllByFolder: jest.fn().mockResolvedValue([]),
    };
    mockFileMetadataService = {
      getTable: jest.fn().mockReturnValue(mockFileTable),
    };

    mockAppUserTable = {
      resolveByEmail: jest.fn().mockResolvedValue({ user_id: 'u1', tenant_id: 't1' }),
    };

    mockSm = {
      get: jest.fn((name) => {
        if (name === 'FolderService') return mockFolderService;
        if (name === 'StorageService') return mockStorageService;
        if (name === 'FileMetadataService') return mockFileMetadataService;
        if (name === 'AppUserTable') return mockAppUserTable;
        return null;
      }),
    };
    service.setServiceManager(mockSm);
    service.table['AppUserTable'] = mockAppUserTable;
  });

  describe('constructor', () => {
    it('should be an instance of AbstractActionService', () => {
      expect(service).toBeInstanceOf(AbstractActionService);
    });
  });

  describe('_resolveUser', () => {
    it('should resolve user via AppUserTable', async () => {
      const result = await service._resolveUser('test@example.com');
      expect(result).toEqual({ user_id: 'u1', tenant_id: 't1' });
      expect(mockAppUserTable.resolveByEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('createFolder', () => {
    it('should create folder without parent (root-level)', async () => {
      mockFolderService.createFolder.mockResolvedValue('new-id');
      const result = await service.createFolder(null, 'TestFolder', 'user@test.com');
      expect(result).toEqual({ newFolderId: 'new-id' });
      expect(mockFolderService.createFolder).toHaveBeenCalledWith('user@test.com', 'TestFolder', null);
    });

    it('should create folder with valid parent', async () => {
      const mockParent = { getTenantId: () => 't1' };
      mockFolderService.getFolderById.mockResolvedValue(mockParent);
      mockFolderService.createFolder.mockResolvedValue('new-id');

      const result = await service.createFolder('parent-id', 'SubFolder', 'user@test.com');
      expect(result).toEqual({ newFolderId: 'new-id' });
    });

    it('should throw if parent not found', async () => {
      mockFolderService.getFolderById.mockResolvedValue(null);
      await expect(service.createFolder('bad-id', 'Sub', 'user@test.com'))
        .rejects.toThrow('Parent folder not found or access denied');
    });

    it('should throw if parent belongs to different tenant', async () => {
      const mockParent = { getTenantId: () => 'other-tenant' };
      mockFolderService.getFolderById.mockResolvedValue(mockParent);
      await expect(service.createFolder('parent-id', 'Sub', 'user@test.com'))
        .rejects.toThrow('Parent folder not found or access denied');
    });
  });

  describe('deleteFolder', () => {
    it('should delete folder and return parent folder ID', async () => {
      const mockFolder = {
        getTenantId: () => 't1',
        getParentFolderId: () => 'parent-id',
      };
      mockFolderService.getFolderById.mockResolvedValue(mockFolder);
      mockFolderService.deleteFolder.mockResolvedValue(true);

      const result = await service.deleteFolder('fold-1', 'user@test.com');
      expect(result).toEqual({ parentFolderId: 'parent-id' });
      expect(mockFolderService.deleteFolder).toHaveBeenCalledWith('fold-1', 'user@test.com');
    });

    it('should throw if folder not found', async () => {
      mockFolderService.getFolderById.mockResolvedValue(null);
      await expect(service.deleteFolder('bad-id', 'user@test.com'))
        .rejects.toThrow('Folder not found');
    });

    it('should throw if access denied (different tenant)', async () => {
      const mockFolder = {
        getTenantId: () => 'other-tenant',
        getParentFolderId: () => 'p1',
      };
      mockFolderService.getFolderById.mockResolvedValue(mockFolder);
      await expect(service.deleteFolder('fold-1', 'user@test.com'))
        .rejects.toThrow('Access denied');
    });

    it('should resolve root folder when no parentFolderId', async () => {
      const mockFolder = {
        getTenantId: () => 't1',
        getParentFolderId: () => null,
      };
      mockFolderService.getFolderById.mockResolvedValue(mockFolder);
      mockFolderService.deleteFolder.mockResolvedValue(true);
      const mockRoot = { getFolderId: () => 'root-id' };
      mockFolderService.getRootFolderByUserEmail.mockResolvedValue(mockRoot);

      const result = await service.deleteFolder('fold-1', 'user@test.com');
      expect(result).toEqual({ parentFolderId: 'root-id' });
    });

    it('should handle root folder resolution failure gracefully', async () => {
      const mockFolder = {
        getTenantId: () => 't1',
        getParentFolderId: () => null,
      };
      mockFolderService.getFolderById.mockResolvedValue(mockFolder);
      mockFolderService.deleteFolder.mockResolvedValue(true);
      mockFolderService.getRootFolderByUserEmail.mockRejectedValue(new Error('no root'));

      const spy = jest.spyOn(console, 'warn').mockImplementation();
      const result = await service.deleteFolder('fold-1', 'user@test.com');
      expect(result.parentFolderId).toBeNull();
      spy.mockRestore();
    });

    it('should handle null rootFolder from getRootFolderByUserEmail', async () => {
      const mockFolder = {
        getTenantId: () => 't1',
        getParentFolderId: () => null,
      };
      mockFolderService.getFolderById.mockResolvedValue(mockFolder);
      mockFolderService.deleteFolder.mockResolvedValue(true);
      mockFolderService.getRootFolderByUserEmail.mockResolvedValue(null);

      const result = await service.deleteFolder('fold-1', 'user@test.com');
      expect(result.parentFolderId).toBeNull();
    });
  });

  describe('prepareDownload', () => {
    it('should prepare folder download with files', async () => {
      const mockFolder = { getTenantId: () => 't1' };
      mockFolderService.getFolderById.mockResolvedValue(mockFolder);

      const mockFile = {
        deleted_at: null,
        getStorageBackendId: () => 'sb1',
        getObjectKey: () => 'key1',
        getOriginalFilename: () => 'file.txt',
        getFileId: () => 'f1',
      };
      const mockFileTable = { fetchAllByFolder: jest.fn().mockResolvedValue([mockFile]) };
      mockFileMetadataService.getTable.mockReturnValue(mockFileTable);

      const mockBackend = { id: 'sb1' };
      mockStorageService.getBackend.mockResolvedValue(mockBackend);
      const mockStream = { pipe: jest.fn() };
      mockStorageService.read.mockResolvedValue(mockStream);

      const result = await service.prepareDownload('fold-1', 'user@test.com');
      expect(result.folder).toBe(mockFolder);
      expect(result.fileEntries).toHaveLength(1);
      expect(result.fileEntries[0].filename).toBe('file.txt');
    });

    it('should throw if folder not found', async () => {
      mockFolderService.getFolderById.mockResolvedValue(null);
      await expect(service.prepareDownload('bad-id', 'user@test.com'))
        .rejects.toThrow('Folder not found');
    });

    it('should throw if access denied', async () => {
      const mockFolder = { getTenantId: () => 'other' };
      mockFolderService.getFolderById.mockResolvedValue(mockFolder);
      await expect(service.prepareDownload('fold-1', 'user@test.com'))
        .rejects.toThrow('Access denied');
    });

    it('should skip deleted files', async () => {
      const mockFolder = { getTenantId: () => 't1' };
      mockFolderService.getFolderById.mockResolvedValue(mockFolder);

      const mockFile = { deleted_at: new Date() };
      const mockFileTable = { fetchAllByFolder: jest.fn().mockResolvedValue([mockFile]) };
      mockFileMetadataService.getTable.mockReturnValue(mockFileTable);

      const result = await service.prepareDownload('fold-1', 'user@test.com');
      expect(result.fileEntries).toHaveLength(0);
    });

    it('should handle stream read failure gracefully', async () => {
      const mockFolder = { getTenantId: () => 't1' };
      mockFolderService.getFolderById.mockResolvedValue(mockFolder);

      const mockFile = {
        deleted_at: null,
        getStorageBackendId: () => 'sb1',
        getObjectKey: () => 'key1',
        getOriginalFilename: () => 'file.txt',
        getFileId: () => 'f1',
      };
      const mockFileTable = { fetchAllByFolder: jest.fn().mockResolvedValue([mockFile]) };
      mockFileMetadataService.getTable.mockReturnValue(mockFileTable);
      mockStorageService.getBackend.mockResolvedValue({});
      mockStorageService.read.mockRejectedValue(new Error('read fail'));

      const spy = jest.spyOn(console, 'error').mockImplementation();
      const result = await service.prepareDownload('fold-1', 'user@test.com');
      expect(result.fileEntries).toHaveLength(0);
      spy.mockRestore();
    });

    it('should use object_key fallback when getObjectKey is not a function', async () => {
      const mockFolder = { getTenantId: () => 't1' };
      mockFolderService.getFolderById.mockResolvedValue(mockFolder);

      const mockFile = {
        deleted_at: null,
        getStorageBackendId: () => 'sb1',
        object_key: 'fallback-key',
        getOriginalFilename: () => 'file.txt',
        getFileId: () => 'f1',
      };
      const mockFileTable = { fetchAllByFolder: jest.fn().mockResolvedValue([mockFile]) };
      mockFileMetadataService.getTable.mockReturnValue(mockFileTable);
      mockStorageService.getBackend.mockResolvedValue({});
      mockStorageService.read.mockResolvedValue({});

      const result = await service.prepareDownload('fold-1', 'user@test.com');
      expect(mockStorageService.read).toHaveBeenCalledWith({}, 'fallback-key');
    });
  });

  describe('restoreFolder', () => {
    it('should restore a deleted folder', async () => {
      const mockFolder = { getTenantId: () => 't1' };
      mockFolderTable.fetchByIdIncludeDeleted.mockResolvedValue(mockFolder);
      mockFolderService.restoreFolder.mockResolvedValue(true);

      await service.restoreFolder('fold-1', 'user@test.com');
      expect(mockFolderService.restoreFolder).toHaveBeenCalledWith('fold-1', 'user@test.com');
    });

    it('should throw if folder not found', async () => {
      mockFolderTable.fetchByIdIncludeDeleted.mockResolvedValue(null);
      await expect(service.restoreFolder('bad-id', 'user@test.com'))
        .rejects.toThrow('Folder not found');
    });

    it('should throw if access denied', async () => {
      const mockFolder = { getTenantId: () => 'other' };
      mockFolderTable.fetchByIdIncludeDeleted.mockResolvedValue(mockFolder);
      await expect(service.restoreFolder('fold-1', 'user@test.com'))
        .rejects.toThrow('Access denied');
    });
  });

  describe('moveFolder', () => {
    it('should move folder to a target folder', async () => {
      const mockFolder = { getTenantId: () => 't1' };
      mockFolderService.getFolderById.mockResolvedValue(mockFolder);
      mockFolderService.moveFolder.mockResolvedValue(true);

      await service.moveFolder('fold-1', 'target-id', 'user@test.com');
      expect(mockFolderService.moveFolder).toHaveBeenCalledWith('fold-1', 'target-id', 'user@test.com');
    });

    it('should throw if folder not found', async () => {
      mockFolderService.getFolderById.mockResolvedValue(null);
      await expect(service.moveFolder('bad-id', 'target', 'user@test.com'))
        .rejects.toThrow('Folder not found');
    });

    it('should throw if access denied', async () => {
      const mockFolder = { getTenantId: () => 'other' };
      mockFolderService.getFolderById.mockResolvedValue(mockFolder);
      await expect(service.moveFolder('fold-1', 'target', 'user@test.com'))
        .rejects.toThrow('Access denied');
    });

    it('should resolve root folder when targetFolderId is empty', async () => {
      const mockFolder = { getTenantId: () => 't1' };
      mockFolderService.getFolderById.mockResolvedValue(mockFolder);
      const mockRoot = { getFolderId: () => 'root-id' };
      mockFolderService.getRootFolderByUserEmail.mockResolvedValue(mockRoot);
      mockFolderService.moveFolder.mockResolvedValue(true);

      await service.moveFolder('fold-1', null, 'user@test.com');
      expect(mockFolderService.moveFolder).toHaveBeenCalledWith('fold-1', 'root-id', 'user@test.com');
    });

    it('should throw if root folder not found when target is empty', async () => {
      const mockFolder = { getTenantId: () => 't1' };
      mockFolderService.getFolderById.mockResolvedValue(mockFolder);
      mockFolderService.getRootFolderByUserEmail.mockResolvedValue(null);

      await expect(service.moveFolder('fold-1', '', 'user@test.com'))
        .rejects.toThrow('Root folder not found');
    });
  });
});
