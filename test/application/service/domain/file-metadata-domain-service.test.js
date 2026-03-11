const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FileMetadataService = require(path.join(projectRoot, 'application/service/domain/file-metadata-domain-service'));
const AbstractDomainService = require(path.join(projectRoot, 'application/service/abstract-domain-service'));
const TableGateway = require(path.join(projectRoot, 'library/db/table-gateway'));

describe('FileMetadataService', () => {
  let service;
  let mockTable;
  let mockSm;
  let mockAppUserTable;
  let mockFileEventTable;
  let mockFilePermissionTable;
  let mockQueryCacheService;
  let mockShareLinkTable;
  let mockFolderTable;
  let mockFolderService;
  let mockUsageDailyService;

  beforeEach(() => {
    service = new FileMetadataService();

    mockTable = Object.create(TableGateway.prototype);
    mockTable.fetchFilesByFolder = jest.fn().mockResolvedValue([]);
    mockTable.fetchFilesByFolderCount = jest.fn().mockResolvedValue(0);
    mockTable.fetchByIds = jest.fn().mockResolvedValue([]);
    mockTable.fetchRecent = jest.fn().mockResolvedValue([]);
    mockTable.fetchSharedWithMe = jest.fn().mockResolvedValue([]);
    mockTable.fetchSearchResults = jest.fn().mockResolvedValue([]);
    mockTable.fetchSearchResultsCount = jest.fn().mockResolvedValue(0);
    mockTable.fetchDeletedFiles = jest.fn().mockResolvedValue([]);
    mockTable.fetchById = jest.fn().mockResolvedValue(null);
    mockTable.fetchByIdIncludeDeleted = jest.fn().mockResolvedValue(null);
    mockTable.insert = jest.fn().mockResolvedValue(true);
    mockTable.update = jest.fn().mockResolvedValue(true);
    mockTable.updateSubStatus = jest.fn().mockResolvedValue(true);
    mockTable.fetchByPublicKey = jest.fn().mockResolvedValue(null);

    mockAppUserTable = {
      resolveByEmail: jest.fn().mockResolvedValue({ user_id: 'u1', tenant_id: 't1' }),
      fetchWithTenantByEmail: jest.fn().mockResolvedValue({ user_id: 'u1', tenant_id: 't1' }),
      fetchByEmailInTenant: jest.fn().mockResolvedValue({ user_id: 'u2' }),
    };

    mockFileEventTable = {
      insertEvent: jest.fn().mockResolvedValue(true),
    };

    mockFilePermissionTable = {
      upsertPermission: jest.fn().mockResolvedValue(true),
      fetchByUserAndFile: jest.fn().mockResolvedValue(null),
      fetchUsersWithAccess: jest.fn().mockResolvedValue([]),
      deleteByFileAndUser: jest.fn().mockResolvedValue(true),
    };

    mockQueryCacheService = {
      onFileChanged: jest.fn().mockReturnValue(Promise.resolve()),
      onPermissionChanged: jest.fn().mockReturnValue(Promise.resolve()),
    };

    mockShareLinkTable = {
      fetchActiveByFileId: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(true),
      revoke: jest.fn().mockResolvedValue(true),
    };

    mockFolderTable = {
      fetchById: jest.fn().mockResolvedValue(null),
    };

    mockFolderService = {
      getRootFolderByUserEmail: jest.fn(),
    };

    mockUsageDailyService = {
      recordUpload: jest.fn().mockResolvedValue(true),
    };

    const mockDbAdapter = { query: jest.fn() };

    mockSm = {
      get: jest.fn((name) => {
        if (name === 'FileMetadataTable') return mockTable;
        if (name === 'AppUserTable') return mockAppUserTable;
        if (name === 'FileEventTable') return mockFileEventTable;
        if (name === 'FilePermissionTable') return mockFilePermissionTable;
        if (name === 'QueryCacheService') return mockQueryCacheService;
        if (name === 'ShareLinkTable') return mockShareLinkTable;
        if (name === 'FolderTable') return mockFolderTable;
        if (name === 'FolderService') return mockFolderService;
        if (name === 'UsageDailyService') return mockUsageDailyService;
        if (name === 'DbAdapter') return mockDbAdapter;
        return null;
      }),
    };
    service.setServiceManager(mockSm);
    service.table = {};
  });

  const makeFile = (overrides = {}) => ({
    getTenantId: () => 't1',
    getFileId: () => 'f1',
    getTitle: () => 'test.txt',
    getFolderId: () => 'fold-1',
    getDeletedAt: () => new Date(),
    getCreatedBy: () => 'u1',
    getOriginalFilename: () => 'test.txt',
    getContentType: () => 'text/plain',
    getStorageBackendId: () => 'sb1',
    getObjectKey: () => 'key1',
    getGeneralAccess: () => 'restricted',
    getPublicKey: () => null,
    getVisibility: () => 'private',
    ...overrides,
  });

  describe('constructor', () => {
    it('should be an instance of AbstractDomainService', () => {
      expect(service).toBeInstanceOf(AbstractDomainService);
    });
  });

  describe('_normalizeRows', () => {
    it('should return empty array for null', () => {
      expect(service._normalizeRows(null)).toEqual([]);
    });
    it('should return empty array for undefined', () => {
      expect(service._normalizeRows(undefined)).toEqual([]);
    });
    it('should return the array if already array', () => {
      const arr = [1, 2];
      expect(service._normalizeRows(arr)).toBe(arr);
    });
    it('should return result.rows if present', () => {
      const rows = [{ id: 1 }];
      expect(service._normalizeRows({ rows })).toBe(rows);
    });
    it('should return empty array for objects without rows', () => {
      expect(service._normalizeRows({ data: 'foo' })).toEqual([]);
    });
  });

  describe('_now', () => {
    it('should return a Date', () => {
      expect(service._now()).toBeInstanceOf(Date);
    });
  });

  describe('_getAdapter', () => {
    it('should get DbAdapter from SM', () => {
      const adapter = service._getAdapter();
      expect(mockSm.get).toHaveBeenCalledWith('DbAdapter');
    });
  });

  describe('_invalidateFileCache / _invalidatePermissionCache', () => {
    it('should call onFileChanged', () => {
      service._invalidateFileCache('t1');
      expect(mockQueryCacheService.onFileChanged).toHaveBeenCalledWith('t1');
    });
    it('should call onPermissionChanged', () => {
      service._invalidatePermissionCache('t1');
      expect(mockQueryCacheService.onPermissionChanged).toHaveBeenCalledWith('t1');
    });
  });

  describe('getFilesByFolder', () => {
    it('should delegate to table', async () => {
      await service.getFilesByFolder('email', 'fold', 10, 0, 'name');
      expect(mockTable.fetchFilesByFolder).toHaveBeenCalledWith('email', 'fold', 10, 0, 'name');
    });
  });

  describe('getFilesByFolderCount', () => {
    it('should delegate to table', async () => {
      await service.getFilesByFolderCount('email', 'fold');
      expect(mockTable.fetchFilesByFolderCount).toHaveBeenCalledWith('email', 'fold');
    });
  });

  describe('getFilesByIds', () => {
    it('should delegate to table', async () => {
      await service.getFilesByIds(['f1', 'f2']);
      expect(mockTable.fetchByIds).toHaveBeenCalledWith(['f1', 'f2']);
    });
  });

  describe('getRecentFiles', () => {
    it('should delegate with defaults', async () => {
      await service.getRecentFiles('email');
      expect(mockTable.fetchRecent).toHaveBeenCalledWith('email', 50, null);
    });
  });

  describe('getSharedFiles', () => {
    it('should return shared files for user', async () => {
      await service.getSharedFiles('email');
      expect(mockAppUserTable.fetchWithTenantByEmail).toHaveBeenCalledWith('email');
      expect(mockTable.fetchSharedWithMe).toHaveBeenCalledWith('u1', 't1', 50, 0);
    });

    it('should return empty array if user not found', async () => {
      mockAppUserTable.fetchWithTenantByEmail.mockResolvedValue(null);
      const result = await service.getSharedFiles('email');
      expect(result).toEqual([]);
    });
  });

  describe('searchFiles', () => {
    it('should delegate with all options', async () => {
      await service.searchFiles('t1', 'u1', 'query', 20, 0, { fileExtension: '.pdf', intitle: 'test' });
      expect(mockTable.fetchSearchResults).toHaveBeenCalledWith('t1', 'u1', 'query', 20, 0, { fileExtension: '.pdf', intitle: 'test', allintitle: null, author: null });
    });
  });

  describe('searchFilesCount', () => {
    it('should delegate', async () => {
      await service.searchFilesCount('t1', 'u1', 'query');
      expect(mockTable.fetchSearchResultsCount).toHaveBeenCalled();
    });
  });

  describe('getDeletedFiles', () => {
    it('should delegate', async () => {
      await service.getDeletedFiles('email');
      expect(mockTable.fetchDeletedFiles).toHaveBeenCalledWith('email');
    });
  });

  describe('deleteFile', () => {
    it('should soft-delete a file', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);

      const result = await service.deleteFile('f1', 'user@test.com');
      expect(result).toBe(true);
      expect(mockTable.update).toHaveBeenCalled();
      expect(mockFileEventTable.insertEvent).toHaveBeenCalled();
    });

    it('should throw if file not found', async () => {
      mockTable.fetchById.mockResolvedValue(null);
      await expect(service.deleteFile('bad', 'user@test.com')).rejects.toThrow('File not found');
    });

    it('should throw if access denied', async () => {
      const file = makeFile({ getTenantId: () => 'other' });
      mockTable.fetchById.mockResolvedValue(file);
      await expect(service.deleteFile('f1', 'user@test.com')).rejects.toThrow('Access denied');
    });

    it('should handle logEvent failure gracefully', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);
      mockFileEventTable.insertEvent.mockRejectedValue(new Error('log fail'));

      const spy = jest.spyOn(console, 'error').mockImplementation();
      const result = await service.deleteFile('f1', 'user@test.com');
      expect(result).toBe(true);
      spy.mockRestore();
    });
  });

  describe('restoreFile', () => {
    it('should restore a deleted file', async () => {
      const file = makeFile({ getDeletedAt: () => new Date() });
      mockTable.fetchByIdIncludeDeleted.mockResolvedValue(file);

      const result = await service.restoreFile('f1', 'user@test.com');
      expect(result).toBe(true);
      expect(mockTable.update).toHaveBeenCalled();
    });

    it('should throw if file not found', async () => {
      await expect(service.restoreFile('bad', 'email')).rejects.toThrow('File not found');
    });

    it('should throw if access denied', async () => {
      const file = makeFile({ getTenantId: () => 'other' });
      mockTable.fetchByIdIncludeDeleted.mockResolvedValue(file);
      await expect(service.restoreFile('f1', 'email')).rejects.toThrow('Access denied');
    });

    it('should throw if file is not in trash', async () => {
      const file = makeFile({ getDeletedAt: () => null });
      mockTable.fetchByIdIncludeDeleted.mockResolvedValue(file);
      await expect(service.restoreFile('f1', 'email')).rejects.toThrow('File is not in trash');
    });

    it('should handle logEvent failure gracefully', async () => {
      const file = makeFile({ getDeletedAt: () => new Date() });
      mockTable.fetchByIdIncludeDeleted.mockResolvedValue(file);
      mockFileEventTable.insertEvent.mockRejectedValue(new Error('fail'));

      const spy = jest.spyOn(console, 'error').mockImplementation();
      const result = await service.restoreFile('f1', 'email');
      expect(result).toBe(true);
      spy.mockRestore();
    });
  });

  describe('prepareUpload', () => {
    it('should insert metadata and return record', async () => {
      const metadata = {
        file_id: 'f1', tenant_id: 't1', folder_id: 'fold1',
        storage_backend_id: 'sb1', original_filename: 'doc.pdf',
        content_type: 'application/pdf', size_bytes: 1024,
        object_key: 'key1', user_id: 'u1',
      };
      const result = await service.prepareUpload(metadata);
      expect(result.file_id).toBe('f1');
      expect(result.record_status).toBe('upload');
      expect(mockTable.insert).toHaveBeenCalled();
      expect(mockFilePermissionTable.upsertPermission).toHaveBeenCalled();
      expect(mockFileEventTable.insertEvent).toHaveBeenCalled();
    });

    it('should use defaults for optional fields', async () => {
      const metadata = {
        file_id: 'f1', tenant_id: 't1', folder_id: 'fold1',
        storage_backend_id: 'sb1', original_filename: 'doc.pdf',
        object_key: 'key1', user_id: 'u1',
      };
      const result = await service.prepareUpload(metadata);
      expect(result.content_type).toBe('application/octet-stream');
      expect(result.size_bytes).toBe(0);
      expect(result.title).toBe('doc.pdf');
      expect(result.visibility).toBe('private');
    });
  });

  describe('finalizeUpload', () => {
    it('should finalize upload', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);

      const result = await service.finalizeUpload('f1', 't1', { size_bytes: 2048, user_id: 'u1' });
      expect(result).toBe(true);
      expect(mockTable.updateSubStatus).toHaveBeenCalled();
    });

    it('should include checksum if provided', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);

      await service.finalizeUpload('f1', 't1', { size_bytes: 100, user_id: 'u1', checksum_sha256: 'abc123' });
      const updateCall = mockTable.updateSubStatus.mock.calls[0][2];
      expect(updateCall.checksum_sha256).toBe('abc123');
    });

    it('should handle usage recording failure', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);
      mockUsageDailyService.recordUpload.mockRejectedValue(new Error('usage fail'));

      const spy = jest.spyOn(console, 'error').mockImplementation();
      const result = await service.finalizeUpload('f1', 't1', { size_bytes: 100, user_id: 'u1' });
      expect(result).toBe(true);
      spy.mockRestore();
    });
  });

  describe('failUpload', () => {
    it('should mark upload as failed', async () => {
      const result = await service.failUpload('f1', 't1', 'u1');
      expect(result).toBe(true);
      expect(mockTable.updateSubStatus).toHaveBeenCalled();
    });
  });

  describe('updateFile', () => {
    it('should rename file', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);

      const result = await service.updateFile('f1', 'new-name.txt', 'user@test.com');
      expect(result).toBe(true);
      expect(mockTable.update).toHaveBeenCalled();
    });

    it('should throw if file not found', async () => {
      await expect(service.updateFile('bad', 'name', 'email')).rejects.toThrow('File not found');
    });

    it('should throw if access denied', async () => {
      const file = makeFile({ getTenantId: () => 'other' });
      mockTable.fetchById.mockResolvedValue(file);
      await expect(service.updateFile('f1', 'name', 'email')).rejects.toThrow('Access denied');
    });
  });

  describe('moveFile', () => {
    it('should move file to target folder', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);
      const targetFolder = { getTenantId: () => 't1' };
      mockFolderTable.fetchById.mockResolvedValue(targetFolder);

      const result = await service.moveFile('f1', 'target-fold', 'user@test.com');
      expect(result).toBe(true);
    });

    it('should throw if file not found', async () => {
      await expect(service.moveFile('bad', 'target', 'email')).rejects.toThrow('File not found');
    });

    it('should throw if access denied', async () => {
      const file = makeFile({ getTenantId: () => 'other' });
      mockTable.fetchById.mockResolvedValue(file);
      await expect(service.moveFile('f1', 'target', 'email')).rejects.toThrow('Access denied');
    });

    it('should throw if destination folder not found', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);
      mockFolderTable.fetchById.mockResolvedValue(null);

      await expect(service.moveFile('f1', 'bad-target', 'email')).rejects.toThrow('Destination folder not found');
    });

    it('should throw if destination folder is in different tenant', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);
      const targetFolder = { getTenantId: () => 'other', tenant_id: 'other' };
      mockFolderTable.fetchById.mockResolvedValue(targetFolder);

      await expect(service.moveFile('f1', 'target', 'email')).rejects.toThrow('Access denied to destination folder');
    });

    it('should use getTenantId function if available on target folder', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);
      const targetFolder = { getTenantId: () => 't1' };
      mockFolderTable.fetchById.mockResolvedValue(targetFolder);

      const result = await service.moveFile('f1', 'target', 'email');
      expect(result).toBe(true);
    });

    it('should fallback to tenant_id property on target folder', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);
      const targetFolder = { tenant_id: 't1' };
      mockFolderTable.fetchById.mockResolvedValue(targetFolder);

      const result = await service.moveFile('f1', 'target', 'email');
      expect(result).toBe(true);
    });

    it('should resolve root folder when target is null', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);
      const mockRoot = { getFolderId: () => 'root-id' };
      mockFolderService.getRootFolderByUserEmail.mockResolvedValue(mockRoot);

      const result = await service.moveFile('f1', null, 'email');
      expect(result).toBe(true);
    });

    it('should throw if root folder not found', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);
      mockFolderService.getRootFolderByUserEmail.mockResolvedValue(null);

      await expect(service.moveFile('f1', '', 'email')).rejects.toThrow('Root folder not found');
    });
  });

  describe('logEvent', () => {
    it('should delegate to FileEventTable', async () => {
      await service.logEvent('f1', 'CREATED', {}, 'u1');
      expect(mockFileEventTable.insertEvent).toHaveBeenCalledWith('f1', 'CREATED', {}, 'u1');
    });
  });

  describe('shareFileWithUser', () => {
    it('should share file with another user (owner sharing)', async () => {
      mockFilePermissionTable.fetchByUserAndFile
        .mockResolvedValueOnce({ getRole: () => 'owner' })
        .mockResolvedValueOnce(null);

      const result = await service.shareFileWithUser('f1', 'target@test.com', 'editor', 'u1', 't1');
      expect(result).toBe(true);
      expect(mockFilePermissionTable.upsertPermission).toHaveBeenCalled();
    });

    it('should throw if actor has no permission', async () => {
      mockFilePermissionTable.fetchByUserAndFile.mockResolvedValueOnce(null);
      await expect(service.shareFileWithUser('f1', 'target@test.com', 'viewer', 'u1', 't1'))
        .rejects.toThrow('Access denied');
    });

    it('should throw if actor is viewer', async () => {
      mockFilePermissionTable.fetchByUserAndFile.mockResolvedValueOnce({ getRole: () => 'viewer' });
      await expect(service.shareFileWithUser('f1', 'target@test.com', 'viewer', 'u1', 't1'))
        .rejects.toThrow('You do not have permission to share this file');
    });

    it('should throw if target user not found', async () => {
      mockFilePermissionTable.fetchByUserAndFile.mockResolvedValueOnce({ getRole: () => 'owner' });
      mockAppUserTable.fetchByEmailInTenant.mockResolvedValue(null);
      await expect(service.shareFileWithUser('f1', 'nobody@test.com', 'viewer', 'u1', 't1'))
        .rejects.toThrow('User not found or not in tenant');
    });

    it('should throw if trying to change own role', async () => {
      mockFilePermissionTable.fetchByUserAndFile.mockResolvedValueOnce({ getRole: () => 'owner' });
      mockAppUserTable.fetchByEmailInTenant.mockResolvedValue({ user_id: 'u1' });
      await expect(service.shareFileWithUser('f1', 'self@test.com', 'viewer', 'u1', 't1'))
        .rejects.toThrow('You cannot change your own role');
    });

    it('should throw if editor tries to modify owner role', async () => {
      mockFilePermissionTable.fetchByUserAndFile
        .mockResolvedValueOnce({ getRole: () => 'editor' })
        .mockResolvedValueOnce({ getRole: () => 'owner' });

      await expect(service.shareFileWithUser('f1', 'target@test.com', 'viewer', 'u1', 't1'))
        .rejects.toThrow("Cannot modify the file owner's role");
    });

    it('should throw if editor tries to grant owner role', async () => {
      mockFilePermissionTable.fetchByUserAndFile
        .mockResolvedValueOnce({ getRole: () => 'editor' })
        .mockResolvedValueOnce(null);

      await expect(service.shareFileWithUser('f1', 'target@test.com', 'owner', 'u1', 't1'))
        .rejects.toThrow('Cannot grant owner role');
    });

    it('should log PERMISSION_UPDATED when role changes', async () => {
      mockFilePermissionTable.fetchByUserAndFile
        .mockResolvedValueOnce({ getRole: () => 'owner' })
        .mockResolvedValueOnce({ getRole: () => 'viewer' });

      await service.shareFileWithUser('f1', 'target@test.com', 'editor', 'u1', 't1');
      expect(mockFileEventTable.insertEvent).toHaveBeenCalledWith(
        'f1', 'PERMISSION_UPDATED',
        expect.objectContaining({ old_role: 'viewer', new_role: 'editor' }),
        'u1'
      );
    });

    it('should not log event when role is same', async () => {
      mockFilePermissionTable.fetchByUserAndFile
        .mockResolvedValueOnce({ getRole: () => 'owner' })
        .mockResolvedValueOnce({ getRole: () => 'editor' });

      await service.shareFileWithUser('f1', 'target@test.com', 'editor', 'u1', 't1');
      expect(mockFileEventTable.insertEvent).not.toHaveBeenCalled();
    });
  });

  describe('removeUserAccess', () => {
    it('should remove user access', async () => {
      mockFilePermissionTable.fetchByUserAndFile
        .mockResolvedValueOnce({ getRole: () => 'owner' })
        .mockResolvedValueOnce({ getRole: () => 'viewer' });

      const result = await service.removeUserAccess('f1', 'target-user', 'actor@test.com');
      expect(result).toBe(true);
    });

    it('should throw if actor not found', async () => {
      mockAppUserTable.fetchWithTenantByEmail.mockResolvedValue(null);
      await expect(service.removeUserAccess('f1', 'target', 'bad@test.com'))
        .rejects.toThrow('Actor not found');
    });

    it('should throw if actor has no permission', async () => {
      mockFilePermissionTable.fetchByUserAndFile.mockResolvedValueOnce(null);
      await expect(service.removeUserAccess('f1', 'target', 'actor@test.com'))
        .rejects.toThrow('Access denied');
    });

    it('should throw if actor is viewer', async () => {
      mockFilePermissionTable.fetchByUserAndFile.mockResolvedValueOnce({ getRole: () => 'viewer' });
      await expect(service.removeUserAccess('f1', 'target', 'actor@test.com'))
        .rejects.toThrow('You do not have permission to manage access');
    });

    it('should return false if target has no existing permission', async () => {
      mockFilePermissionTable.fetchByUserAndFile
        .mockResolvedValueOnce({ getRole: () => 'owner' })
        .mockResolvedValueOnce(null);

      const result = await service.removeUserAccess('f1', 'target', 'actor@test.com');
      expect(result).toBe(false);
    });

    it('should throw if editor tries to remove owner', async () => {
      mockFilePermissionTable.fetchByUserAndFile
        .mockResolvedValueOnce({ getRole: () => 'editor' })
        .mockResolvedValueOnce({ getRole: () => 'owner' });

      await expect(service.removeUserAccess('f1', 'target', 'actor@test.com'))
        .rejects.toThrow("Cannot remove the file owner's access");
    });
  });

  describe('getFilePermissions', () => {
    it('should return permissions', async () => {
      mockFilePermissionTable.fetchUsersWithAccess.mockResolvedValue([{ role: 'owner' }]);
      const result = await service.getFilePermissions('f1', 't1');
      expect(result).toEqual([{ role: 'owner' }]);
    });

    it('should auto-create owner permission if none exist', async () => {
      const meta = makeFile({ getCreatedBy: () => 'u1' });
      mockFilePermissionTable.fetchUsersWithAccess
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ role: 'owner' }]);
      mockTable.fetchById.mockResolvedValue(meta);

      const result = await service.getFilePermissions('f1', 't1');
      expect(mockFilePermissionTable.upsertPermission).toHaveBeenCalled();
      expect(result).toEqual([{ role: 'owner' }]);
    });

    it('should return empty if no permissions and no metadata', async () => {
      mockFilePermissionTable.fetchUsersWithAccess.mockResolvedValue([]);
      mockTable.fetchById.mockResolvedValue(null);

      const result = await service.getFilePermissions('f1', 't1');
      expect(result).toEqual([]);
    });
  });

  describe('getActivePublicLink', () => {
    it('should return null when no active link', async () => {
      const result = await service.getActivePublicLink('f1');
      expect(result).toBeNull();
    });

    it('should return link details when active', async () => {
      const mockLink = {
        getShareId: () => 's1',
        getTokenHash: () => 'hash',
        getExpiresDt: () => null,
        getRevokedDt: () => null,
        getRole: () => 'viewer',
      };
      mockShareLinkTable.fetchActiveByFileId.mockResolvedValue(mockLink);

      const result = await service.getActivePublicLink('f1');
      expect(result.share_id).toBe('s1');
      expect(result.role).toBe('viewer');
    });
  });

  describe('getFileSharingStatus', () => {
    it('should return null if file not found', async () => {
      mockTable.fetchById.mockResolvedValue(null);
      const result = await service.getFileSharingStatus('f1');
      expect(result).toBeNull();
    });

    it('should return sharing status without link', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);

      const result = await service.getFileSharingStatus('f1');
      expect(result.general_access).toBe('restricted');
      expect(result.share_id).toBeNull();
    });

    it('should return sharing status with link', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);
      const mockLink = {
        getShareId: () => 's1',
        getTokenHash: () => 'hash',
        getExpiresDt: () => null,
        getRevokedDt: () => null,
        getRole: () => 'viewer',
      };
      mockShareLinkTable.fetchActiveByFileId.mockResolvedValue(mockLink);

      const result = await service.getFileSharingStatus('f1');
      expect(result.share_id).toBe('s1');
      expect(result.role).toBe('viewer');
    });
  });

  describe('unpublishFile', () => {
    it('should unpublish a file', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);

      // Mock Update constructor
      jest.spyOn(service, '_getAdapter').mockReturnValue({});
      const mockExecute = jest.fn().mockResolvedValue(true);
      jest.mock(globalThis.applicationPath('/library/db/sql/update'), () => {
        return jest.fn().mockImplementation(() => ({
          table: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: mockExecute,
        }));
      }, { virtual: true });

      // Since we can't easily mock the Update class inline, test the validation logic
      const result = await service.unpublishFile('f1', 'user@test.com');
      expect(result).toBe(true);
    });

    it('should throw if user not found', async () => {
      mockAppUserTable.fetchWithTenantByEmail.mockResolvedValue(null);
      await expect(service.unpublishFile('f1', 'bad@test.com')).rejects.toThrow('User not found');
    });

    it('should throw if file not found', async () => {
      mockTable.fetchById.mockResolvedValue(null);
      await expect(service.unpublishFile('f1', 'user@test.com')).rejects.toThrow('File not found');
    });

    it('should throw if access denied', async () => {
      const file = makeFile({ getTenantId: () => 'other' });
      mockTable.fetchById.mockResolvedValue(file);
      await expect(service.unpublishFile('f1', 'user@test.com')).rejects.toThrow('Access denied');
    });
  });

  describe('revokePublicLink', () => {
    it('should throw if user not found', async () => {
      mockAppUserTable.fetchWithTenantByEmail.mockResolvedValue(null);
      await expect(service.revokePublicLink('f1', 'bad@test.com')).rejects.toThrow('User not found');
    });

    it('should throw if file not found', async () => {
      mockTable.fetchById.mockResolvedValue(null);
      await expect(service.revokePublicLink('f1', 'user@test.com')).rejects.toThrow('File not found');
    });

    it('should throw if access denied', async () => {
      const file = makeFile({ getTenantId: () => 'other' });
      mockTable.fetchById.mockResolvedValue(file);
      await expect(service.revokePublicLink('f1', 'user@test.com')).rejects.toThrow('Access denied');
    });

    it('should throw if actor is viewer', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);
      mockFilePermissionTable.fetchByUserAndFile.mockResolvedValue({ getRole: () => 'viewer' });
      await expect(service.revokePublicLink('f1', 'user@test.com')).rejects.toThrow('You do not have permission to manage link sharing');
    });

    it('should throw if actor has no permission', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);
      mockFilePermissionTable.fetchByUserAndFile.mockResolvedValue(null);
      await expect(service.revokePublicLink('f1', 'user@test.com')).rejects.toThrow('You do not have permission to manage link sharing');
    });
  });

  describe('createPublicLink', () => {
    it('should throw if user not found', async () => {
      mockAppUserTable.fetchWithTenantByEmail.mockResolvedValue(null);
      await expect(service.createPublicLink('f1', 'bad@test.com')).rejects.toThrow('User not found');
    });

    it('should throw if file not found', async () => {
      mockTable.fetchById.mockResolvedValue(null);
      await expect(service.createPublicLink('f1', 'user@test.com')).rejects.toThrow('File not found');
    });

    it('should throw if access denied', async () => {
      const file = makeFile({ getTenantId: () => 'other' });
      mockTable.fetchById.mockResolvedValue(file);
      await expect(service.createPublicLink('f1', 'user@test.com')).rejects.toThrow('Access denied');
    });

    it('should throw if actor is viewer', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);
      mockFilePermissionTable.fetchByUserAndFile.mockResolvedValue({ getRole: () => 'viewer' });
      await expect(service.createPublicLink('f1', 'user@test.com')).rejects.toThrow('You do not have permission to manage link sharing');
    });

    it('should throw if actor has no permission', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);
      mockFilePermissionTable.fetchByUserAndFile.mockResolvedValue(null);
      await expect(service.createPublicLink('f1', 'user@test.com')).rejects.toThrow('You do not have permission to manage link sharing');
    });
  });

  describe('publishFile', () => {
    it('should throw if user not found', async () => {
      mockAppUserTable.fetchWithTenantByEmail.mockResolvedValue(null);
      await expect(service.publishFile('f1', 'bad@test.com')).rejects.toThrow('User not found');
    });

    it('should throw if file not found', async () => {
      mockTable.fetchById.mockResolvedValue(null);
      await expect(service.publishFile('f1', 'user@test.com')).rejects.toThrow('File not found');
    });

    it('should throw if access denied', async () => {
      const file = makeFile({ getTenantId: () => 'other' });
      mockTable.fetchById.mockResolvedValue(file);
      await expect(service.publishFile('f1', 'user@test.com')).rejects.toThrow('Access denied');
    });

    it('should return existing public key if already published and public', async () => {
      const file = makeFile({
        getPublicKey: () => 'existing-key-123',
        getVisibility: () => 'public',
      });
      mockTable.fetchById.mockResolvedValue(file);

      const result = await service.publishFile('f1', 'user@test.com');
      expect(result).toBe('existing-key-123');
    });

    it('should update visibility if already published but not public', async () => {
      const file = makeFile({
        getPublicKey: () => 'existing-key-456',
        getVisibility: () => 'private',
      });
      mockTable.fetchById.mockResolvedValue(file);

      const result = await service.publishFile('f1', 'user@test.com');
      expect(result).toBe('existing-key-456');
    });

    it('should generate new public key when not published', async () => {
      const file = makeFile({
        getPublicKey: () => null,
        getVisibility: () => 'private',
      });
      mockTable.fetchById.mockResolvedValue(file);

      const result = await service.publishFile('f1', 'user@test.com');
      expect(typeof result).toBe('string');
      expect(result.length).toBe(32); // 16 bytes hex = 32 chars
      expect(mockFileEventTable.insertEvent).toHaveBeenCalledWith(
        'f1', 'METADATA_UPDATED',
        expect.objectContaining({ action: 'published' }),
        'u1'
      );
    });
  });

  describe('createPublicLink - full flow', () => {
    it('should return existing token hash when link exists with same role', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);
      mockFilePermissionTable.fetchByUserAndFile.mockResolvedValue({ getRole: () => 'editor' });
      mockShareLinkTable.fetchActiveByFileId.mockResolvedValue({
        getRole: () => 'viewer',
        getShareId: () => 's1',
        getTokenHash: () => 'existing-hash',
      });

      const result = await service.createPublicLink('f1', 'user@test.com', { role: 'viewer' });
      expect(result).toBe('existing-hash');
    });

    it('should update role on existing link when role differs', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);
      mockFilePermissionTable.fetchByUserAndFile.mockResolvedValue({ getRole: () => 'editor' });
      mockShareLinkTable.fetchActiveByFileId.mockResolvedValue({
        getRole: () => 'viewer',
        getShareId: () => 's1',
        getTokenHash: () => 'existing-hash',
      });

      const result = await service.createPublicLink('f1', 'user@test.com', { role: 'editor' });
      expect(result).toBe('existing-hash');
      expect(mockFileEventTable.insertEvent).toHaveBeenCalledWith(
        'f1', 'PERMISSION_UPDATED',
        expect.objectContaining({ old_role: 'viewer', new_role: 'editor' }),
        'u1'
      );
    });

    it('should create new link when no existing link', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);
      mockFilePermissionTable.fetchByUserAndFile.mockResolvedValue({ getRole: () => 'editor' });
      mockShareLinkTable.fetchActiveByFileId.mockResolvedValue(null);

      const result = await service.createPublicLink('f1', 'user@test.com');
      expect(typeof result).toBe('string');
      expect(result.length).toBe(64); // 32 bytes hex = 64 chars
      expect(mockShareLinkTable.create).toHaveBeenCalledWith(
        expect.objectContaining({
          file_id: 'f1',
          tenant_id: 't1',
          role: 'viewer',
        })
      );
      expect(mockFileEventTable.insertEvent).toHaveBeenCalledWith(
        'f1', 'PERMISSION_UPDATED',
        expect.objectContaining({ action: 'new_link' }),
        'u1'
      );
    });

    it('should pass password and expires options', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);
      mockFilePermissionTable.fetchByUserAndFile.mockResolvedValue({ getRole: () => 'owner' });
      mockShareLinkTable.fetchActiveByFileId.mockResolvedValue(null);

      const expires = new Date('2026-12-31');
      await service.createPublicLink('f1', 'user@test.com', {
        role: 'editor',
        password: 'hashed-pw',
        expires,
      });

      expect(mockShareLinkTable.create).toHaveBeenCalledWith(
        expect.objectContaining({
          password_hash: 'hashed-pw',
          expires_dt: expires,
          role: 'editor',
        })
      );
    });
  });

  describe('revokePublicLink - full flow', () => {
    it('should revoke link and update metadata', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);
      mockFilePermissionTable.fetchByUserAndFile.mockResolvedValue({ getRole: () => 'editor' });

      const result = await service.revokePublicLink('f1', 'user@test.com');
      expect(result).toBe(true);
      expect(mockShareLinkTable.revoke).toHaveBeenCalledWith('t1', 'f1');
      expect(mockFileEventTable.insertEvent).toHaveBeenCalledWith(
        'f1', 'PERMISSION_UPDATED',
        expect.objectContaining({ action: 'link_revoked', general_access: 'restricted' }),
        'u1'
      );
    });

    it('should work when actor is owner', async () => {
      const file = makeFile();
      mockTable.fetchById.mockResolvedValue(file);
      mockFilePermissionTable.fetchByUserAndFile.mockResolvedValue({ getRole: () => 'owner' });

      const result = await service.revokePublicLink('f1', 'user@test.com');
      expect(result).toBe(true);
    });
  });
});
