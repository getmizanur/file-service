const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FileActionService = require(path.join(projectRoot, 'application/service/action/file-action-service'));
const AbstractActionService = require(path.join(projectRoot, 'application/service/abstract-action-service'));

describe('FileActionService', () => {
  let service;
  let mockSm;
  let mockFileTable;
  let mockFileService;
  let mockFolderService;
  let mockStorageService;
  let mockFileStarService;
  let mockFilePermissionService;
  let mockFileShareLinkService;
  let mockAuthService;
  let mockAppUserTable;

  beforeEach(() => {
    service = new FileActionService();

    mockFileTable = {
      fetchById: jest.fn(),
      fetchByPublicKey: jest.fn(),
    };

    mockFileService = {
      getTable: jest.fn().mockReturnValue(mockFileTable),
      deleteFile: jest.fn().mockResolvedValue(true),
      moveFile: jest.fn().mockResolvedValue(true),
      restoreFile: jest.fn().mockResolvedValue(true),
    };

    mockFolderService = {
      getFolderById: jest.fn(),
      getRootFolderByUserEmail: jest.fn(),
    };

    mockStorageService = {
      getBackend: jest.fn().mockResolvedValue({ id: 'sb1' }),
      read: jest.fn().mockResolvedValue({ pipe: jest.fn() }),
    };

    mockFileStarService = {
      toggleStar: jest.fn().mockResolvedValue(true),
    };

    mockFilePermissionService = {
      hasAccess: jest.fn().mockResolvedValue(true),
    };

    mockFileShareLinkService = {
      resolveToken: jest.fn(),
    };

    mockAuthService = {
      hasIdentity: jest.fn().mockReturnValue(true),
      getIdentity: jest.fn().mockReturnValue({ user_id: 'u1' }),
    };

    mockAppUserTable = {
      resolveByEmail: jest.fn().mockResolvedValue({ user_id: 'u1', tenant_id: 't1' }),
    };

    mockSm = {
      get: jest.fn((name) => {
        if (name === 'FileMetadataService') return mockFileService;
        if (name === 'FolderService') return mockFolderService;
        if (name === 'StorageService') return mockStorageService;
        if (name === 'FileStarService') return mockFileStarService;
        if (name === 'FilePermissionService') return mockFilePermissionService;
        if (name === 'FileShareLinkService') return mockFileShareLinkService;
        if (name === 'AuthenticationService') return mockAuthService;
        if (name === 'AppUserTable') return mockAppUserTable;
        return null;
      }),
    };
    service.setServiceManager(mockSm);
  });

  const makeFile = (overrides = {}) => ({
    getCreatedBy: () => 'u1',
    getTenantId: () => 't1',
    getFileId: () => 'f1',
    getFolderId: () => 'fold-1',
    getStorageBackendId: () => 'sb1',
    getObjectKey: () => 'key1',
    getVisibility: () => 'private',
    getGeneralAccess: () => 'restricted',
    deleted_at: null,
    ...overrides,
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
    });
  });

  describe('_checkOwnerOrPermission', () => {
    it('should pass when user is the creator', async () => {
      const file = makeFile();
      await expect(service._checkOwnerOrPermission(file, 'u1')).resolves.toBeUndefined();
    });

    it('should pass when user has permission', async () => {
      const file = makeFile({ getCreatedBy: () => 'u2' });
      await expect(service._checkOwnerOrPermission(file, 'u1')).resolves.toBeUndefined();
    });

    it('should throw when user has no access', async () => {
      const file = makeFile({ getCreatedBy: () => 'u2' });
      mockFilePermissionService.hasAccess.mockResolvedValue(false);
      await expect(service._checkOwnerOrPermission(file, 'u1')).rejects.toThrow('Access denied');
    });
  });

  describe('_resolveShareLink', () => {
    it('should delegate to FileShareLinkService.resolveToken', async () => {
      const mockLink = { file_id: 'f1' };
      mockFileShareLinkService.resolveToken.mockResolvedValue(mockLink);
      const result = await service._resolveShareLink('some-token');
      expect(result).toBe(mockLink);
    });
  });

  describe('deleteFile', () => {
    it('should delete file and return parent folder ID', async () => {
      const file = makeFile();
      mockFileTable.fetchById.mockResolvedValue(file);

      const result = await service.deleteFile('f1', 'user@test.com');
      expect(result).toEqual({ parentFolderId: 'fold-1' });
      expect(mockFileService.deleteFile).toHaveBeenCalledWith('f1', 'user@test.com');
    });

    it('should throw if file not found', async () => {
      mockFileTable.fetchById.mockResolvedValue(null);
      await expect(service.deleteFile('bad-id', 'user@test.com')).rejects.toThrow('File not found');
    });

    it('should resolve root folder when file has no parent folder', async () => {
      const file = makeFile({ getFolderId: () => null });
      mockFileTable.fetchById.mockResolvedValue(file);
      const mockRoot = { getFolderId: () => 'root-id' };
      mockFolderService.getRootFolderByUserEmail.mockResolvedValue(mockRoot);

      const result = await service.deleteFile('f1', 'user@test.com');
      expect(result).toEqual({ parentFolderId: 'root-id' });
    });

    it('should handle root folder resolution failure gracefully', async () => {
      const file = makeFile({ getFolderId: () => null });
      mockFileTable.fetchById.mockResolvedValue(file);
      mockFolderService.getRootFolderByUserEmail.mockRejectedValue(new Error('no root'));

      const spy = jest.spyOn(console, 'warn').mockImplementation();
      const result = await service.deleteFile('f1', 'user@test.com');
      expect(result.parentFolderId).toBeNull();
      spy.mockRestore();
    });
  });

  describe('starFile', () => {
    it('should toggle star and return parent folder ID', async () => {
      const file = makeFile();
      mockFileTable.fetchById.mockResolvedValue(file);

      const result = await service.starFile('f1', 'user@test.com');
      expect(result).toEqual({ parentFolderId: 'fold-1' });
      expect(mockFileStarService.toggleStar).toHaveBeenCalledWith('f1', 'user@test.com');
    });

    it('should throw if file not found', async () => {
      mockFileTable.fetchById.mockResolvedValue(null);
      await expect(service.starFile('bad-id', 'user@test.com')).rejects.toThrow('File not found');
    });

    it('should resolve root folder when file has no parent', async () => {
      const file = makeFile({ getFolderId: () => null });
      mockFileTable.fetchById.mockResolvedValue(file);
      const mockRoot = { getFolderId: () => 'root-id' };
      mockFolderService.getRootFolderByUserEmail.mockResolvedValue(mockRoot);

      const result = await service.starFile('f1', 'user@test.com');
      expect(result).toEqual({ parentFolderId: 'root-id' });
    });

    it('should handle root folder resolution failure gracefully', async () => {
      const file = makeFile({ getFolderId: () => null });
      mockFileTable.fetchById.mockResolvedValue(file);
      mockFolderService.getRootFolderByUserEmail.mockRejectedValue(new Error('fail'));

      const spy = jest.spyOn(console, 'warn').mockImplementation();
      const result = await service.starFile('f1', 'user@test.com');
      expect(result.parentFolderId).toBeNull();
      spy.mockRestore();
    });
  });

  describe('streamDownload', () => {
    it('should return file and stream', async () => {
      const file = makeFile();
      mockFileTable.fetchById.mockResolvedValue(file);

      const result = await service.streamDownload('f1', 'u1');
      expect(result.file).toBe(file);
      expect(result.stream).toBeDefined();
    });

    it('should throw if file not found', async () => {
      mockFileTable.fetchById.mockResolvedValue(null);
      await expect(service.streamDownload('bad-id', 'u1')).rejects.toThrow('File not found');
    });

    it('should throw if file is deleted', async () => {
      const file = makeFile({ deleted_at: new Date() });
      mockFileTable.fetchById.mockResolvedValue(file);
      await expect(service.streamDownload('f1', 'u1')).rejects.toThrow('File deleted');
    });

    it('should use object_key fallback when getObjectKey is missing', async () => {
      const file = makeFile();
      delete file.getObjectKey;
      file.object_key = 'fallback-key';
      mockFileTable.fetchById.mockResolvedValue(file);

      await service.streamDownload('f1', 'u1');
      expect(mockStorageService.read).toHaveBeenCalledWith({ id: 'sb1' }, 'fallback-key');
    });
  });

  describe('streamView', () => {
    it('should return file and stream', async () => {
      const file = makeFile();
      mockFileTable.fetchById.mockResolvedValue(file);

      const result = await service.streamView('f1', 'u1');
      expect(result.file).toBe(file);
    });
  });

  describe('moveFile', () => {
    it('should move file to target folder', async () => {
      const file = makeFile();
      mockFileTable.fetchById.mockResolvedValue(file);
      const mockTarget = { getTenantId: () => 't1' };
      mockFolderService.getFolderById.mockResolvedValue(mockTarget);

      await service.moveFile('f1', 'target-fold', 'user@test.com');
      expect(mockFileService.moveFile).toHaveBeenCalledWith('f1', 'target-fold', 'user@test.com');
    });

    it('should throw if file not found', async () => {
      mockFileTable.fetchById.mockResolvedValue(null);
      await expect(service.moveFile('bad-id', 'target', 'user@test.com')).rejects.toThrow('File not found');
    });

    it('should throw if target folder not found or access denied', async () => {
      const file = makeFile();
      mockFileTable.fetchById.mockResolvedValue(file);
      mockFolderService.getFolderById.mockResolvedValue(null);

      await expect(service.moveFile('f1', 'bad-target', 'user@test.com'))
        .rejects.toThrow('Target folder not found or access denied');
    });

    it('should throw if target folder belongs to different tenant', async () => {
      const file = makeFile();
      mockFileTable.fetchById.mockResolvedValue(file);
      const mockTarget = { getTenantId: () => 'other-tenant' };
      mockFolderService.getFolderById.mockResolvedValue(mockTarget);

      await expect(service.moveFile('f1', 'target', 'user@test.com'))
        .rejects.toThrow('Target folder not found or access denied');
    });

    it('should move to root when targetFolderId is null', async () => {
      const file = makeFile();
      mockFileTable.fetchById.mockResolvedValue(file);

      await service.moveFile('f1', null, 'user@test.com');
      expect(mockFileService.moveFile).toHaveBeenCalledWith('f1', null, 'user@test.com');
    });
  });

  describe('restoreFile', () => {
    it('should delegate to FileMetadataService.restoreFile', async () => {
      await service.restoreFile('f1', 'user@test.com');
      expect(mockFileService.restoreFile).toHaveBeenCalledWith('f1', 'user@test.com');
    });
  });

  describe('resolvePublicLink', () => {
    it('should resolve public link and return file', async () => {
      const shareLink = { file_id: 'f1' };
      mockFileShareLinkService.resolveToken.mockResolvedValue(shareLink);
      const file = makeFile({ getGeneralAccess: () => 'anyone_with_link' });
      mockFileTable.fetchById.mockResolvedValue(file);

      const result = await service.resolvePublicLink('token123');
      expect(result.file).toBe(file);
      expect(result.shareLink).toBe(shareLink);
      expect(result.token).toBe('token123');
    });

    it('should throw if file not found', async () => {
      mockFileShareLinkService.resolveToken.mockResolvedValue({ file_id: 'f1' });
      mockFileTable.fetchById.mockResolvedValue(null);
      await expect(service.resolvePublicLink('token')).rejects.toThrow('File not found');
    });

    it('should throw if file is deleted', async () => {
      mockFileShareLinkService.resolveToken.mockResolvedValue({ file_id: 'f1' });
      const file = makeFile({ deleted_at: new Date() });
      mockFileTable.fetchById.mockResolvedValue(file);
      await expect(service.resolvePublicLink('token')).rejects.toThrow('File deleted');
    });

    it('should enforce restricted access when general_access is restricted', async () => {
      mockFileShareLinkService.resolveToken.mockResolvedValue({ file_id: 'f1' });
      const file = makeFile({ getGeneralAccess: () => 'restricted' });
      mockFileTable.fetchById.mockResolvedValue(file);

      const result = await service.resolvePublicLink('token');
      expect(result.file).toBe(file);
    });

    it('should throw if restricted and user not logged in', async () => {
      mockFileShareLinkService.resolveToken.mockResolvedValue({ file_id: 'f1' });
      const file = makeFile({ getGeneralAccess: () => 'restricted', getCreatedBy: () => 'other' });
      mockFileTable.fetchById.mockResolvedValue(file);
      mockAuthService.hasIdentity.mockReturnValue(false);

      await expect(service.resolvePublicLink('token')).rejects.toThrow('Login required');
    });

    it('should throw if restricted and user has no access', async () => {
      mockFileShareLinkService.resolveToken.mockResolvedValue({ file_id: 'f1' });
      const file = makeFile({ getGeneralAccess: () => 'restricted', getCreatedBy: () => 'other' });
      mockFileTable.fetchById.mockResolvedValue(file);
      mockAuthService.getIdentity.mockReturnValue({ user_id: 'u2' });
      mockFilePermissionService.hasAccess.mockResolvedValue(false);

      await expect(service.resolvePublicLink('token')).rejects.toThrow('Access denied');
    });
  });

  describe('streamPublicDownload', () => {
    it('should stream file via public link', async () => {
      mockFileShareLinkService.resolveToken.mockResolvedValue({ file_id: 'f1' });
      const file = makeFile({ getGeneralAccess: () => 'anyone_with_link' });
      mockFileTable.fetchById.mockResolvedValue(file);

      const result = await service.streamPublicDownload('token');
      expect(result.file).toBe(file);
      expect(result.stream).toBeDefined();
    });

    it('should throw if file not found', async () => {
      mockFileShareLinkService.resolveToken.mockResolvedValue({ file_id: 'f1' });
      mockFileTable.fetchById.mockResolvedValue(null);
      await expect(service.streamPublicDownload('token')).rejects.toThrow('File not found');
    });

    it('should throw if file deleted', async () => {
      mockFileShareLinkService.resolveToken.mockResolvedValue({ file_id: 'f1' });
      const file = makeFile({ deleted_at: new Date() });
      mockFileTable.fetchById.mockResolvedValue(file);
      await expect(service.streamPublicDownload('token')).rejects.toThrow('File deleted');
    });

    it('should throw if object key is missing', async () => {
      mockFileShareLinkService.resolveToken.mockResolvedValue({ file_id: 'f1' });
      const file = makeFile({ getGeneralAccess: () => 'anyone_with_link' });
      delete file.getObjectKey;
      file.object_key = null;
      mockFileTable.fetchById.mockResolvedValue(file);
      await expect(service.streamPublicDownload('token')).rejects.toThrow('File object key missing');
    });

    it('should use object_key fallback when getObjectKey is not a function', async () => {
      mockFileShareLinkService.resolveToken.mockResolvedValue({ file_id: 'f1' });
      const file = makeFile({ getGeneralAccess: () => 'anyone_with_link' });
      delete file.getObjectKey;
      file.object_key = 'fallback-key';
      mockFileTable.fetchById.mockResolvedValue(file);

      await service.streamPublicDownload('token');
      expect(mockStorageService.read).toHaveBeenCalledWith({ id: 'sb1' }, 'fallback-key');
    });
  });

  describe('streamPublicServe', () => {
    it('should stream file via public key', async () => {
      const file = makeFile({ getVisibility: () => 'public' });
      mockFileTable.fetchByPublicKey.mockResolvedValue(file);

      const result = await service.streamPublicServe('public-key');
      expect(result.file).toBe(file);
      expect(result.stream).toBeDefined();
    });

    it('should throw if file not found', async () => {
      mockFileTable.fetchByPublicKey.mockResolvedValue(null);
      await expect(service.streamPublicServe('bad-key')).rejects.toThrow('File not found');
    });

    it('should throw if file is not public', async () => {
      const file = makeFile({ getVisibility: () => 'private' });
      mockFileTable.fetchByPublicKey.mockResolvedValue(file);
      await expect(service.streamPublicServe('key')).rejects.toThrow('File is not public');
    });

    it('should use object_key fallback', async () => {
      const file = makeFile({ getVisibility: () => 'public' });
      delete file.getObjectKey;
      file.object_key = 'fallback';
      mockFileTable.fetchByPublicKey.mockResolvedValue(file);

      await service.streamPublicServe('key');
      expect(mockStorageService.read).toHaveBeenCalledWith({ id: 'sb1' }, 'fallback');
    });
  });
});
