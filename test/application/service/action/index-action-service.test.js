const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const IndexActionService = require(path.join(projectRoot, 'application/service/action/index-action-service'));
const AbstractActionService = require(path.join(projectRoot, 'application/service/abstract-action-service'));

describe('IndexActionService', () => {
  let service;

  beforeEach(() => {
    service = new IndexActionService();
  });

  describe('constructor', () => {
    it('should be an instance of AbstractActionService', () => {
      expect(service).toBeInstanceOf(AbstractActionService);
    });
  });

  describe('method existence', () => {
    it('should have list method', () => {
      expect(typeof service.list).toBe('function');
    });

    it('should have _resolveLayoutMode method', () => {
      expect(typeof service._resolveLayoutMode).toBe('function');
    });

    it('should have _resolveSortMode method', () => {
      expect(typeof service._resolveSortMode).toBe('function');
    });

    it('should have _resolveRootFolder method', () => {
      expect(typeof service._resolveRootFolder).toBe('function');
    });

    it('should have _fetchAllFolders method', () => {
      expect(typeof service._fetchAllFolders).toBe('function');
    });

    it('should have _resolveCurrentFolder method', () => {
      expect(typeof service._resolveCurrentFolder).toBe('function');
    });

    it('should have _fetchViewData method', () => {
      expect(typeof service._fetchViewData).toBe('function');
    });

    it('should have _buildBreadcrumbs method', () => {
      expect(typeof service._buildBreadcrumbs).toBe('function');
    });

    it('should have _sortMergedItems method', () => {
      expect(typeof service._sortMergedItems).toBe('function');
    });

    it('should have _paginateFoldersAndFiles method', () => {
      expect(typeof service._paginateFoldersAndFiles).toBe('function');
    });
  });

  describe('_resolveCurrentFolder', () => {
    it('should use rootFolderId when no folderId provided', () => {
      const folders = [{ folder_id: 'root-id' }];
      const rootFolder = { folder_id: 'root-id' };
      const result = service._resolveCurrentFolder(null, rootFolder, folders, 'user@test.com');
      expect(result.currentFolderId).toBe('root-id');
      expect(result.rootFolderId).toBe('root-id');
    });

    it('should treat "undefined" string as null', () => {
      const folders = [{ folder_id: 'root-id' }];
      const rootFolder = { folder_id: 'root-id' };
      const result = service._resolveCurrentFolder('undefined', rootFolder, folders, 'user@test.com');
      expect(result.currentFolderId).toBe('root-id');
    });

    it('should accept valid tenant folder', () => {
      const folders = [
        { folder_id: 'root-id' },
        { folder_id: 'child-id' }
      ];
      const rootFolder = { folder_id: 'root-id' };
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      const result = service._resolveCurrentFolder('child-id', rootFolder, folders, 'user@test.com');
      expect(result.currentFolderId).toBe('child-id');
      spy.mockRestore();
    });

    it('should reject unauthorized folder IDs and fall back to root', () => {
      const folders = [{ folder_id: 'root-id' }];
      const rootFolder = { folder_id: 'root-id' };
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      const result = service._resolveCurrentFolder('hacker-folder-id', rootFolder, folders, 'user@test.com');
      expect(result.currentFolderId).toBe('root-id');
      spy.mockRestore();
    });
  });

  describe('_buildBreadcrumbs', () => {
    it('should return My Drive for null currentFolderId', () => {
      const result = service._buildBreadcrumbs(null, 'root-id', []);
      expect(result).toEqual([{ name: 'My Drive', folder_id: 'root-id' }]);
    });

    it('should build breadcrumb trail from current to root', () => {
      const folders = [
        { folder_id: 'root-id', parent_folder_id: null, name: 'Root' },
        { folder_id: 'child-id', parent_folder_id: 'root-id', name: 'Child' }
      ];
      const result = service._buildBreadcrumbs('child-id', 'root-id', folders);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('My Drive');
      expect(result[1].name).toBe('Child');
    });
  });

  describe('_sortMergedItems', () => {
    it('should sort by name', () => {
      const items = [
        { name: 'Banana', item_type: 'file' },
        { name: 'Apple', item_type: 'file' }
      ];
      service._sortMergedItems(items, 'name');
      expect(items[0].name).toBe('Apple');
      expect(items[1].name).toBe('Banana');
    });

    it('should sort by size descending', () => {
      const items = [
        { name: 'small', size_bytes: 100, item_type: 'file' },
        { name: 'big', size_bytes: 1000, item_type: 'file' }
      ];
      service._sortMergedItems(items, 'size');
      expect(items[0].name).toBe('big');
    });

    it('should sort by last_modified descending', () => {
      const items = [
        { name: 'old', updated_dt: '2020-01-01', item_type: 'file' },
        { name: 'new', updated_dt: '2025-01-01', item_type: 'file' }
      ];
      service._sortMergedItems(items, 'last_modified');
      expect(items[0].name).toBe('new');
    });

    it('should not change order for unknown sort mode', () => {
      const items = [
        { name: 'B', item_type: 'file' },
        { name: 'A', item_type: 'file' }
      ];
      service._sortMergedItems(items, 'unknown');
      expect(items[0].name).toBe('B');
    });
  });

  describe('_paginateFoldersAndFiles', () => {
    it('should return folders from current page when offset is within folders', async () => {
      const allFolders = [{ folder_id: 'f1' }, { folder_id: 'f2' }, { folder_id: 'f3' }];
      const fetchFilesFn = jest.fn().mockResolvedValue([{ file_id: 'file1' }]);
      const result = await service._paginateFoldersAndFiles(allFolders, 0, 2, 3, fetchFilesFn);
      expect(result.subFolders).toHaveLength(2);
      expect(fetchFilesFn).not.toHaveBeenCalled();
    });

    it('should fetch files when offset is past all folders', async () => {
      const allFolders = [{ folder_id: 'f1' }];
      const fetchFilesFn = jest.fn().mockResolvedValue([{ file_id: 'file1' }]);
      const result = await service._paginateFoldersAndFiles(allFolders, 2, 10, 1, fetchFilesFn);
      expect(result.subFolders).toHaveLength(0);
      expect(fetchFilesFn).toHaveBeenCalledWith(10, 1);
    });

    it('should mix folders and files when page boundary crosses', async () => {
      const allFolders = [{ folder_id: 'f1' }, { folder_id: 'f2' }];
      const fetchFilesFn = jest.fn().mockResolvedValue([{ file_id: 'file1' }]);
      const result = await service._paginateFoldersAndFiles(allFolders, 1, 3, 2, fetchFilesFn);
      expect(result.subFolders).toHaveLength(1);
      expect(fetchFilesFn).toHaveBeenCalledWith(2, 0);
    });
  });

  describe('_resolveLayoutMode', () => {
    it('should save and return layout from query', async () => {
      const mockCache = { save: jest.fn(), load: jest.fn() };
      const result = await service._resolveLayoutMode(mockCache, 'user@test.com', 'list');
      expect(result).toBe('list');
      expect(mockCache.save).toHaveBeenCalled();
    });

    it('should return cached layout when no query', async () => {
      const mockCache = { save: jest.fn(), load: jest.fn().mockResolvedValue('list') };
      const result = await service._resolveLayoutMode(mockCache, 'user@test.com', null);
      expect(result).toBe('list');
    });

    it('should default to grid when no query and no cache', async () => {
      const mockCache = { save: jest.fn(), load: jest.fn().mockResolvedValue(null) };
      const result = await service._resolveLayoutMode(mockCache, 'user@test.com', null);
      expect(result).toBe('grid');
    });
  });

  describe('_resolveSortMode', () => {
    it('should save and return sort from query', async () => {
      const mockCache = { save: jest.fn(), load: jest.fn() };
      const result = await service._resolveSortMode(mockCache, 'user@test.com', 'size');
      expect(result).toBe('size');
    });

    it('should return cached sort when no query', async () => {
      const mockCache = { save: jest.fn(), load: jest.fn().mockResolvedValue('last_modified') };
      const result = await service._resolveSortMode(mockCache, 'user@test.com', null);
      expect(result).toBe('last_modified');
    });

    it('should default to name when no query and no cache', async () => {
      const mockCache = { save: jest.fn(), load: jest.fn().mockResolvedValue(null) };
      const result = await service._resolveSortMode(mockCache, 'user@test.com', null);
      expect(result).toBe('name');
    });
  });

  describe('_resolveRootFolder', () => {
    it('should resolve root folder and tenantId via cache', async () => {
      const mockQcs = {
        cacheThrough: jest.fn().mockResolvedValue({
          rootFolder: { folder_id: 'root-1' },
          tenant_id: 'tenant-1'
        })
      };
      const mockFolderService = {};
      const result = await service._resolveRootFolder(mockQcs, mockFolderService, 'user@test.com', 'hash');
      expect(result.rootFolder).toEqual({ folder_id: 'root-1' });
      expect(result.tenantId).toBe('tenant-1');
    });

    it('should return null rootFolder and tenantId on error', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      const mockQcs = { cacheThrough: jest.fn().mockRejectedValue(new Error('fail')) };
      const result = await service._resolveRootFolder(mockQcs, {}, 'user@test.com', 'hash');
      expect(result.rootFolder).toBeNull();
      expect(result.tenantId).toBeNull();
      spy.mockRestore();
    });
  });

  describe('_fetchAllFolders', () => {
    it('should fetch folders via cacheThrough', async () => {
      const mockQcs = {
        cacheThrough: jest.fn().mockResolvedValue([{ folder_id: 'f1' }])
      };
      const mockFolderService = {};
      const result = await service._fetchAllFolders(mockQcs, mockFolderService, 'tenant-1', 'hash', ['reg']);
      expect(result).toEqual([{ folder_id: 'f1' }]);
    });
  });

  describe('_fetchViewData', () => {
    let mockCtx;

    beforeEach(() => {
      mockCtx = {
        sm: {},
        qcs: { cacheThrough: jest.fn().mockResolvedValue([]) },
        folderService: {
          getRecentFolders: jest.fn().mockResolvedValue([]),
          getFoldersByParent: jest.fn().mockResolvedValue([]),
          getTrashedFolders: jest.fn().mockResolvedValue([]),
          searchFolders: jest.fn().mockResolvedValue([]),
        },
        fileMetadataService: {
          getRecentFiles: jest.fn().mockResolvedValue([]),
          getSharedFiles: jest.fn().mockResolvedValue([]),
          getDeletedFiles: jest.fn().mockResolvedValue([]),
          getFilesByFolderCount: jest.fn().mockResolvedValue(0),
          getFilesByFolder: jest.fn().mockResolvedValue([]),
          searchFiles: jest.fn().mockResolvedValue([]),
          searchFilesCount: jest.fn().mockResolvedValue(0),
        },
        folderStarService: { listStarred: jest.fn().mockResolvedValue([]) },
        tenantId: 'tenant-1',
        emailHash: 'hash',
        userEmail: 'user@test.com',
        identity: { user_id: 'u1' },
        userReg: 'reg:user:hash',
        tenantReg: 'reg:tenant:tenant-1',
        currentFolderId: 'root-1',
        pageSize: 25,
        page: 1,
        sortMode: 'name',
      };
    });

    it('should handle recent viewMode', async () => {
      const result = await service._fetchViewData('recent', null, mockCtx);
      expect(mockCtx.fileMetadataService.getRecentFiles).toHaveBeenCalled();
      expect(mockCtx.folderService.getRecentFolders).toHaveBeenCalled();
      expect(result).toHaveProperty('subFolders');
      expect(result).toHaveProperty('filesList');
    });

    it('should handle starred viewMode', async () => {
      const result = await service._fetchViewData('starred', null, mockCtx);
      expect(result.subFolders).toEqual([]);
    });

    it('should handle shared-with-me viewMode', async () => {
      const result = await service._fetchViewData('shared-with-me', null, mockCtx);
      expect(mockCtx.fileMetadataService.getSharedFiles).toHaveBeenCalled();
    });

    it('should handle trash viewMode', async () => {
      const result = await service._fetchViewData('trash', null, mockCtx);
      expect(mockCtx.fileMetadataService.getDeletedFiles).toHaveBeenCalled();
      expect(mockCtx.folderService.getTrashedFolders).toHaveBeenCalled();
    });

    it('should handle default viewMode', async () => {
      const result = await service._fetchViewData('my-drive', null, mockCtx);
      expect(result).toHaveProperty('subFolders');
      expect(result).toHaveProperty('filesList');
    });

    it('should handle search viewMode with searchQuery', async () => {
      const result = await service._fetchViewData('search', 'test query', mockCtx);
      expect(result).toHaveProperty('subFolders');
      expect(result).toHaveProperty('filesList');
    });

    it('should catch errors and return empty data', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      mockCtx.fileMetadataService.getRecentFiles.mockRejectedValue(new Error('fail'));
      const result = await service._fetchViewData('recent', null, mockCtx);
      expect(result.subFolders).toEqual([]);
      expect(result.filesList).toEqual([]);
      spy.mockRestore();
    });
  });

  describe('_fetchStarredFileIds', () => {
    it('should return starred file IDs via cache', async () => {
      const mockQcs = { cacheThrough: jest.fn().mockResolvedValue(['f1', 'f2']) };
      const mockSm = {};
      const result = await service._fetchStarredFileIds(mockQcs, mockSm, 'user@test.com', 'hash', 'reg');
      expect(result).toEqual(['f1', 'f2']);
    });

    it('should return empty on error', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      const mockQcs = { cacheThrough: jest.fn().mockRejectedValue(new Error('fail')) };
      const result = await service._fetchStarredFileIds(mockQcs, {}, 'user@test.com', 'hash', 'reg');
      expect(result).toEqual([]);
      spy.mockRestore();
    });
  });

  describe('_fetchDefaultViewData branches', () => {
    it('should skip subfolder fetch when tenantId is null', async () => {
      const mockCtx = {
        qcs: { cacheThrough: jest.fn().mockImplementation((key, fn) => fn()) },
        folderService: { getFoldersByParent: jest.fn().mockResolvedValue([]) },
        fileMetadataService: {
          getFilesByFolderCount: jest.fn().mockResolvedValue(0),
          getFilesByFolder: jest.fn().mockResolvedValue([]),
        },
        tenantId: null,
        emailHash: 'hash',
        userEmail: 'user@test.com',
        currentFolderId: 'root-1',
        tenantReg: null,
        pageSize: 25,
        page: 1,
        sortMode: 'name',
      };
      const result = await service._fetchViewData('my-drive', null, mockCtx);
      expect(result.subFolders).toEqual([]);
    });

    it('should handle pagination when totalItems > pageSize', async () => {
      const mockCtx = {
        qcs: { cacheThrough: jest.fn().mockImplementation((key, fn) => fn()) },
        folderService: { getFoldersByParent: jest.fn().mockResolvedValue([]) },
        fileMetadataService: {
          getFilesByFolderCount: jest.fn().mockResolvedValue(30),
          getFilesByFolder: jest.fn().mockResolvedValue(Array(25).fill({ file_id: 'f' })),
        },
        tenantId: 'tid',
        emailHash: 'hash',
        userEmail: 'user@test.com',
        currentFolderId: 'root-1',
        tenantReg: 'reg:tenant:tid',
        pageSize: 25,
        page: 1,
        sortMode: 'name',
      };
      const result = await service._fetchViewData('my-drive', null, mockCtx);
      expect(result.pagination).not.toBeNull();
      expect(result.pagination.totalPages).toBe(2);
    });

    it('should use toObject on entities returned from cacheThrough callbacks', async () => {
      const entityWithToObject = { toObject: jest.fn().mockReturnValue({ folder_id: 'f1' }) };
      const plainEntity = { folder_id: 'f2' };
      const fileEntity = { toObject: jest.fn().mockReturnValue({ file_id: 'file1' }) };
      const mockCtx = {
        qcs: { cacheThrough: jest.fn().mockImplementation((key, fn) => fn()) },
        folderService: { getFoldersByParent: jest.fn().mockResolvedValue([entityWithToObject, plainEntity]) },
        fileMetadataService: {
          getFilesByFolderCount: jest.fn().mockResolvedValue(1),
          getFilesByFolder: jest.fn().mockResolvedValue([fileEntity]),
        },
        tenantId: 'tid',
        emailHash: 'hash',
        userEmail: 'user@test.com',
        currentFolderId: 'root-1',
        tenantReg: 'reg:tenant:tid',
        pageSize: 25,
        page: 1,
        sortMode: 'name',
      };
      const result = await service._fetchViewData('my-drive', null, mockCtx);
      expect(entityWithToObject.toObject).toHaveBeenCalled();
      expect(fileEntity.toObject).toHaveBeenCalled();
    });
  });

  describe('_fetchSearchViewData branches', () => {
    it('should handle search with filetype filter (skips folder search)', async () => {
      const mockCtx = {
        folderService: { searchFolders: jest.fn() },
        fileMetadataService: {
          searchFilesCount: jest.fn().mockResolvedValue(1),
          searchFiles: jest.fn().mockResolvedValue([{ file_id: 'f1' }]),
        },
        tenantId: 'tid',
        identity: { user_id: 'u1' },
        pageSize: 25,
        page: 1,
      };
      // searchQuery with filetype: e.g. "filetype:pdf test"
      const result = await service._fetchViewData('search', 'filetype:pdf test', mockCtx);
      expect(mockCtx.folderService.searchFolders).not.toHaveBeenCalled();
    });

    it('should handle search with intitle filter', async () => {
      const mockCtx = {
        folderService: { searchFolders: jest.fn().mockResolvedValue([]) },
        fileMetadataService: {
          searchFilesCount: jest.fn().mockResolvedValue(0),
          searchFiles: jest.fn().mockResolvedValue([]),
        },
        tenantId: 'tid',
        identity: { user_id: 'u1' },
        pageSize: 25,
        page: 1,
      };
      const result = await service._fetchViewData('search', 'intitle:report', mockCtx);
      expect(result.subFolders).toEqual([]);
    });

    it('should produce pagination when totalItems > pageSize in search', async () => {
      const mockCtx = {
        folderService: { searchFolders: jest.fn().mockResolvedValue([]) },
        fileMetadataService: {
          searchFilesCount: jest.fn().mockResolvedValue(30),
          searchFiles: jest.fn().mockResolvedValue(Array(25).fill({ file_id: 'f' })),
        },
        tenantId: 'tid',
        identity: { user_id: 'u1' },
        pageSize: 25,
        page: 1,
      };
      const result = await service._fetchViewData('search', 'test', mockCtx);
      expect(result.pagination).not.toBeNull();
    });

    it('should return null pagination when totalItems <= pageSize', async () => {
      const mockCtx = {
        folderService: { searchFolders: jest.fn().mockResolvedValue([]) },
        fileMetadataService: {
          searchFilesCount: jest.fn().mockResolvedValue(2),
          searchFiles: jest.fn().mockResolvedValue([{ file_id: 'f1' }, { file_id: 'f2' }]),
        },
        tenantId: 'tid',
        identity: { user_id: 'u1' },
        pageSize: 25,
        page: 1,
      };
      const result = await service._fetchViewData('search', 'test', mockCtx);
      expect(result.pagination).toBeNull();
    });
  });

  describe('_resolveRootFolder - toObject branch', () => {
    it('should handle rootFolder without toObject (plain object)', async () => {
      const mockQcs = {
        cacheThrough: jest.fn().mockImplementation((key, fn) => fn())
      };
      const mockFolderService = {
        getRootFolderWithContext: jest.fn().mockResolvedValue({
          rootFolder: { folder_id: 'root-1', name: 'Root' }, // no toObject
          user_id: 'u1',
          tenant_id: 'tid'
        })
      };
      const result = await service._resolveRootFolder(mockQcs, mockFolderService, 'user@test.com', 'hash');
      expect(result.rootFolder).toEqual({ folder_id: 'root-1', name: 'Root' });
    });

    it('should handle rootFolder with toObject', async () => {
      const mockQcs = {
        cacheThrough: jest.fn().mockImplementation((key, fn) => fn())
      };
      const mockFolderService = {
        getRootFolderWithContext: jest.fn().mockResolvedValue({
          rootFolder: { toObject: () => ({ folder_id: 'root-1' }) },
          user_id: 'u1',
          tenant_id: 'tid'
        })
      };
      const result = await service._resolveRootFolder(mockQcs, mockFolderService, 'user@test.com', 'hash');
      expect(result.rootFolder).toEqual({ folder_id: 'root-1' });
    });
  });

  describe('_fetchAllFolders - toObject branch', () => {
    it('should handle entities with toObject', async () => {
      const mockQcs = {
        cacheThrough: jest.fn().mockImplementation((key, fn) => fn())
      };
      const mockFolderService = {
        getFoldersByTenant: jest.fn().mockResolvedValue([
          { toObject: () => ({ folder_id: 'f1' }) },
          { folder_id: 'f2' }
        ])
      };
      const result = await service._fetchAllFolders(mockQcs, mockFolderService, 'tid', 'hash', ['reg']);
      expect(result).toEqual([{ folder_id: 'f1' }, { folder_id: 'f2' }]);
    });
  });

  describe('_fetchStarredFileIds - toObject branches', () => {
    it('should handle starred files with getFileId method', async () => {
      const mockQcs = { cacheThrough: jest.fn().mockImplementation((key, fn) => fn()) };
      const mockSm = {
        get: jest.fn().mockReturnValue({
          getStarredFiles: jest.fn().mockResolvedValue([
            { getFileId: () => 'f1' },
            { file_id: 'f2' }
          ])
        })
      };
      const result = await service._fetchStarredFileIds(mockQcs, mockSm, 'user@test.com', 'hash', 'reg');
      expect(result).toEqual(['f1', 'f2']);
    });
  });

  describe('_fetchStarredFolderIds - toObject branch', () => {
    it('should handle entities with toObject in cacheThrough callback', async () => {
      const mockQcs = { cacheThrough: jest.fn().mockImplementation((key, fn) => fn()) };
      const mockFolderStarService = {
        listStarred: jest.fn().mockResolvedValue([
          { toObject: () => ({ folder_id: 'sf1' }) },
          { folder_id: 'sf2' }
        ])
      };
      const result = await service._fetchStarredFolderIds('my-drive', [], mockQcs, mockFolderStarService, 'tid', { user_id: 'u1' }, 'reg');
      expect(result).toEqual(['sf1', 'sf2']);
    });
  });

  describe('_populateSharedFlags - edge branches', () => {
    it('should skip folder share fetch when tenantId is null', async () => {
      const mergedItems = [
        { item_type: 'file', id: 'f1' },
        { item_type: 'folder', folder_id: 'fold1' },
      ];
      const mockFolderShareLinkTable = { fetchSharedFolderIds: jest.fn() };
      const mockSm = {
        get: jest.fn((name) => {
          if (name === 'ShareLinkTable') return { fetchSharedFileIds: jest.fn().mockResolvedValue(new Set()) };
          if (name === 'FolderShareLinkTable') return mockFolderShareLinkTable;
          if (name === 'FilePermissionTable') return { fetchUserSharedFileIds: jest.fn().mockResolvedValue(new Set()) };
          return null;
        })
      };
      await service._populateSharedFlags(mergedItems, mockSm, null);
      expect(mockFolderShareLinkTable.fetchSharedFolderIds).not.toHaveBeenCalled();
    });

    it('should skip file share fetch when no file IDs', async () => {
      const mergedItems = [
        { item_type: 'folder', folder_id: 'fold1' },
      ];
      const mockShareLinkTable = { fetchSharedFileIds: jest.fn() };
      const mockSm = {
        get: jest.fn((name) => {
          if (name === 'ShareLinkTable') return mockShareLinkTable;
          if (name === 'FolderShareLinkTable') return { fetchSharedFolderIds: jest.fn().mockResolvedValue(new Set()) };
          if (name === 'FilePermissionTable') return { fetchUserSharedFileIds: jest.fn() };
          return null;
        })
      };
      await service._populateSharedFlags(mergedItems, mockSm, 'tid');
      expect(mockShareLinkTable.fetchSharedFileIds).not.toHaveBeenCalled();
    });
  });

  describe('list - null tenantId branches', () => {
    it('should handle null tenantId (tenantReg null, folderRegistries has only userReg)', async () => {
      const mockCache = { save: jest.fn(), load: jest.fn().mockResolvedValue(null) };
      service.getCache = jest.fn().mockReturnValue(mockCache);

      const mockQcs = {
        emailHash: jest.fn().mockReturnValue('hash'),
        cacheThrough: jest.fn().mockImplementation((key, fn) => fn())
      };

      const mockFolderService = {
        getRootFolderWithContext: jest.fn().mockRejectedValue(new Error('no root')),
        getFoldersByTenant: jest.fn().mockResolvedValue([]),
        buildFolderTree: jest.fn().mockReturnValue([]),
      };

      const mockSm = {
        get: jest.fn((name) => {
          const map = {
            FolderService: mockFolderService,
            FileMetadataService: { getFilesByFolderCount: jest.fn().mockResolvedValue(0), getFilesByFolder: jest.fn().mockResolvedValue([]) },
            FolderStarService: { listStarred: jest.fn().mockResolvedValue([]) },
            QueryCacheService: mockQcs,
            FileStarService: { getStarredFiles: jest.fn().mockResolvedValue([]) },
            ShareLinkTable: { fetchSharedFileIds: jest.fn().mockResolvedValue(new Set()) },
            FolderShareLinkTable: { fetchSharedFolderIds: jest.fn().mockResolvedValue(new Set()) },
            FilePermissionTable: { fetchUserSharedFileIds: jest.fn().mockResolvedValue(new Set()) },
            FileDerivativeTable: { fetchFileIdsWithThumbnails: jest.fn().mockResolvedValue(new Set()), fetchFileIdsWithPreviewPages: jest.fn().mockResolvedValue(new Set()) },
          };
          return map[name] || null;
        })
      };
      service.setServiceManager(mockSm);

      const spy = jest.spyOn(console, 'error').mockImplementation();
      const result = await service.list({
        userEmail: 'user@test.com',
        identity: { user_id: 'u1' },
        folderId: null,
      });
      expect(result.currentFolderId).toBeNull();
      spy.mockRestore();
    });
  });

  describe('list - shared-with-me viewMode', () => {
    it('should return empty plainSubFolders for shared-with-me', async () => {
      const mockCache = { save: jest.fn(), load: jest.fn().mockResolvedValue(null) };
      service.getCache = jest.fn().mockReturnValue(mockCache);

      const mockQcs = {
        emailHash: jest.fn().mockReturnValue('hash'),
        cacheThrough: jest.fn().mockImplementation((key, fn) => fn())
      };

      const mockFolderService = {
        getRootFolderWithContext: jest.fn().mockResolvedValue({
          rootFolder: { folder_id: 'root-1', toObject: () => ({ folder_id: 'root-1' }) },
          user_id: 'u1', tenant_id: 'tid'
        }),
        getFoldersByTenant: jest.fn().mockResolvedValue([]),
        getFoldersByParent: jest.fn().mockResolvedValue([{ folder_id: 'sub1' }]),
        buildFolderTree: jest.fn().mockReturnValue([]),
      };

      const mockSm = {
        get: jest.fn((name) => {
          const map = {
            FolderService: mockFolderService,
            FileMetadataService: { getSharedFiles: jest.fn().mockResolvedValue([{ file_id: 'f1' }]) },
            FolderStarService: { listStarred: jest.fn().mockResolvedValue([]) },
            QueryCacheService: mockQcs,
            FileStarService: { getStarredFiles: jest.fn().mockResolvedValue([]) },
            ShareLinkTable: { fetchSharedFileIds: jest.fn().mockResolvedValue(new Set()) },
            FolderShareLinkTable: { fetchSharedFolderIds: jest.fn().mockResolvedValue(new Set()) },
            FilePermissionTable: { fetchUserSharedFileIds: jest.fn().mockResolvedValue(new Set()) },
            FileDerivativeTable: { fetchFileIdsWithThumbnails: jest.fn().mockResolvedValue(new Set()), fetchFileIdsWithPreviewPages: jest.fn().mockResolvedValue(new Set()) },
          };
          return map[name] || null;
        })
      };
      service.setServiceManager(mockSm);

      const result = await service.list({
        userEmail: 'user@test.com',
        identity: { user_id: 'u1' },
        folderId: null,
        viewMode: 'shared-with-me',
      });
      // shared-with-me should produce empty plainSubFolders
      expect(result.subFolders).toEqual([]);
    });
  });

  describe('_resolveCurrentFolder - null rootFolder', () => {
    it('should handle null rootFolder', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      const result = service._resolveCurrentFolder('some-id', null, [], 'user@test.com');
      expect(result.rootFolderId).toBeNull();
      // 'some-id' is not in tenant folders, so falls back to rootFolderId (null)
      expect(result.currentFolderId).toBeNull();
      spy.mockRestore();
    });

    it('should handle rootFolder without folder_id', () => {
      const result = service._resolveCurrentFolder(null, {}, [], 'user@test.com');
      // rootFolder.folder_id is undefined, so `|| null` gives null
      expect(result.rootFolderId).toBeNull();
      expect(result.currentFolderId).toBeNull();
    });
  });

  describe('_fetchSearchViewData - advanced search options', () => {
    it('should pass allintitle and author options', async () => {
      const mockCtx = {
        folderService: { searchFolders: jest.fn().mockResolvedValue([]) },
        fileMetadataService: {
          searchFilesCount: jest.fn().mockResolvedValue(0),
          searchFiles: jest.fn().mockResolvedValue([]),
        },
        tenantId: 'tid',
        identity: { user_id: 'u1' },
        pageSize: 25,
        page: 1,
      };
      await service._fetchViewData('search', 'allintitle:report author:john', mockCtx);
      expect(mockCtx.folderService.searchFolders).toHaveBeenCalled();
      const searchCall = mockCtx.folderService.searchFolders.mock.calls[0];
      // folderOptions should include allintitle and author
      expect(searchCall[4]).toHaveProperty('allintitle');
      expect(searchCall[4]).toHaveProperty('author');
    });
  });

  describe('_populateSharedFlags - folder with only id (no folder_id)', () => {
    it('should use id when folder_id is missing', async () => {
      const mergedItems = [
        { item_type: 'folder', id: 'fold1' }, // no folder_id, only id
      ];
      const mockSm = {
        get: jest.fn((name) => {
          if (name === 'ShareLinkTable') return { fetchSharedFileIds: jest.fn().mockResolvedValue(new Set()) };
          if (name === 'FolderShareLinkTable') return { fetchSharedFolderIds: jest.fn().mockResolvedValue(new Set(['fold1'])) };
          if (name === 'FilePermissionTable') return { fetchUserSharedFileIds: jest.fn().mockResolvedValue(new Set()) };
          return null;
        })
      };
      await service._populateSharedFlags(mergedItems, mockSm, 'tid');
      expect(mergedItems[0].is_shared).toBe(true);
    });
  });

  describe('_sortMergedItems - size with folder items', () => {
    it('should sort folders to bottom in size sort', () => {
      const items = [
        { name: 'folder', item_type: 'folder', size_bytes: 0 },
        { name: 'file', item_type: 'file', size_bytes: 500 },
        { name: 'file2', item_type: 'file', size_bytes: null },
      ];
      service._sortMergedItems(items, 'size');
      expect(items[0].name).toBe('file');
    });
  });

  describe('_buildLocationAnnotations - pathCache', () => {
    it('should use pathCache for repeated folder IDs', () => {
      const folders = [
        { folder_id: 'root', parent_folder_id: null, name: 'Root' },
        { folder_id: 'child', parent_folder_id: 'root', name: 'Child' }
      ];
      const plainFiles = [
        { folder_id: 'child' },
        { folder_id: 'child' }, // second file in same folder - triggers cache hit
      ];
      const plainSubFolders = [];
      service._buildLocationAnnotations(plainFiles, plainSubFolders, folders, (x) => x);
      expect(plainFiles[0].location_path).toBe('Root / Child');
      expect(plainFiles[1].location_path).toBe('Root / Child');
    });

    it('should handle subfolder with null parent_folder_id', () => {
      const folders = [];
      const plainFiles = [];
      const plainSubFolders = [{ parent_folder_id: null }];
      service._buildLocationAnnotations(plainFiles, plainSubFolders, folders, (x) => x);
      expect(plainSubFolders[0].location).toBe('');
    });
  });

  describe('_fetchViewData - shared-with-me subfolder error', () => {
    it('should catch subfolder fetch error and log it', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      const mockCtx = {
        fileMetadataService: {
          getSharedFiles: jest.fn().mockResolvedValue([{ file_id: 'f1' }]),
        },
        folderService: {
          getFoldersByParent: jest.fn().mockRejectedValue(new Error('subfolder error')),
        },
        userEmail: 'user@test.com',
        tenantId: 'tid',
        currentFolderId: 'root-1',
      };
      const result = await service._fetchViewData('shared-with-me', null, mockCtx);
      expect(result.filesList).toHaveLength(1);
      expect(result.subFolders).toEqual([]);
      expect(spy).toHaveBeenCalledWith(
        '[IndexActionService] Error fetching subfolders:',
        expect.any(Error)
      );
      spy.mockRestore();
    });
  });

  describe('_fetchStarredViewData - cacheThrough callback', () => {
    it('should invoke folderStarService.listStarred and map toObject', async () => {
      const starredFolder = { toObject: jest.fn().mockReturnValue({ folder_id: 'sf1', name: 'Star' }) };
      const plainFolder = { folder_id: 'sf2', name: 'Plain' };
      const mockCtx = {
        qcs: { cacheThrough: jest.fn().mockImplementation((key, fn) => fn()) },
        folderStarService: { listStarred: jest.fn().mockResolvedValue([starredFolder, plainFolder]) },
        tenantId: 'tid',
        identity: { user_id: 'u1' },
        userReg: 'reg:user:hash',
      };
      const result = await service._fetchViewData('starred', null, mockCtx);
      expect(starredFolder.toObject).toHaveBeenCalled();
      expect(result.subFolders).toHaveLength(2);
    });
  });

  describe('_fetchSharedViewData - no tenantId', () => {
    it('should skip subfolder fetch when tenantId is null', async () => {
      const mockCtx = {
        fileMetadataService: {
          getSharedFiles: jest.fn().mockResolvedValue([]),
        },
        folderService: {
          getFoldersByParent: jest.fn(),
        },
        userEmail: 'user@test.com',
        tenantId: null,
        currentFolderId: 'root-1',
      };
      const result = await service._fetchViewData('shared-with-me', null, mockCtx);
      expect(mockCtx.folderService.getFoldersByParent).not.toHaveBeenCalled();
      expect(result.subFolders).toEqual([]);
    });
  });

  describe('_fetchStarredFileDetails', () => {
    it('should return empty for no starred IDs', async () => {
      const result = await service._fetchStarredFileDetails({}, []);
      expect(result).toEqual([]);
    });

    it('should map file objects to plain structures', async () => {
      const mockService = {
        getFilesByIds: jest.fn().mockResolvedValue([
          { file_id: 'f1', title: 'Test', updated_dt: '2025-01-01', size_bytes: 100, document_type: 'general' }
        ])
      };
      const result = await service._fetchStarredFileDetails(mockService, ['f1']);
      expect(result[0].id).toBe('f1');
      expect(result[0].name).toBe('Test');
      expect(result[0].item_type).toBe('file');
    });

    it('should handle entities with toObject', async () => {
      const mockService = {
        getFilesByIds: jest.fn().mockResolvedValue([
          { toObject: () => ({ file_id: 'f1', title: 'T', updated_dt: '2025-01-01', size_bytes: 50, document_type: 'doc' }) }
        ])
      };
      const result = await service._fetchStarredFileDetails(mockService, ['f1']);
      expect(result[0].id).toBe('f1');
    });

    it('should return empty on error', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      const mockService = { getFilesByIds: jest.fn().mockRejectedValue(new Error('fail')) };
      const result = await service._fetchStarredFileDetails(mockService, ['f1']);
      expect(result).toEqual([]);
      spy.mockRestore();
    });
  });

  describe('_fetchStarredFolderIds', () => {
    it('should return subfolder IDs directly for starred viewMode', async () => {
      const subFolders = [{ folder_id: 'f1' }, { folder_id: 'f2' }];
      const result = await service._fetchStarredFolderIds('starred', subFolders, {}, {}, null, {}, 'reg');
      expect(result).toEqual(['f1', 'f2']);
    });

    it('should fetch via cacheThrough for non-starred viewMode', async () => {
      const mockQcs = { cacheThrough: jest.fn().mockResolvedValue([{ folder_id: 'f1' }]) };
      const mockFolderStarService = {};
      const result = await service._fetchStarredFolderIds('my-drive', [], mockQcs, mockFolderStarService, 'tid', { user_id: 'u1' }, 'reg');
      expect(result).toEqual(['f1']);
    });

    it('should return empty on error', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      const mockQcs = { cacheThrough: jest.fn().mockRejectedValue(new Error('fail')) };
      const result = await service._fetchStarredFolderIds('my-drive', [], mockQcs, {}, 'tid', { user_id: 'u1' }, 'reg');
      expect(result).toEqual([]);
      spy.mockRestore();
    });
  });

  describe('_buildLocationAnnotations', () => {
    it('should annotate files and folders with location paths', () => {
      const folders = [
        { folder_id: 'root', parent_folder_id: null, name: 'Root' },
        { folder_id: 'child', parent_folder_id: 'root', name: 'Child' }
      ];
      const plainFiles = [{ folder_id: 'child' }];
      const plainSubFolders = [{ parent_folder_id: 'root' }];
      const toPlain = (x) => x;

      service._buildLocationAnnotations(plainFiles, plainSubFolders, folders, toPlain);

      expect(plainFiles[0].location).toBe('Child');
      expect(plainFiles[0].location_path).toBe('Root / Child');
      expect(plainSubFolders[0].location).toBe('Root');
    });

    it('should handle files with no folder_id', () => {
      const plainFiles = [{ folder_id: null }];
      const plainSubFolders = [];
      service._buildLocationAnnotations(plainFiles, plainSubFolders, [], (x) => x);
      expect(plainFiles[0].location).toBe('');
      expect(plainFiles[0].location_path).toBe('');
    });
  });

  describe('_populateSharedFlags', () => {
    it('should set is_shared on items', async () => {
      const mergedItems = [
        { item_type: 'file', id: 'f1' },
        { item_type: 'folder', folder_id: 'fold1' },
      ];
      const mockSm = {
        get: jest.fn((name) => {
          if (name === 'ShareLinkTable') return { fetchSharedFileIds: jest.fn().mockResolvedValue(new Set(['f1'])) };
          if (name === 'FolderShareLinkTable') return { fetchSharedFolderIds: jest.fn().mockResolvedValue(new Set(['fold1'])) };
          if (name === 'FilePermissionTable') return { fetchUserSharedFileIds: jest.fn().mockResolvedValue(new Set()) };
          return null;
        })
      };
      await service._populateSharedFlags(mergedItems, mockSm, 'tid');
      expect(mergedItems[0].is_shared).toBe(true);
      expect(mergedItems[1].is_shared).toBe(true);
    });

    it('should handle empty items', async () => {
      const mergedItems = [];
      const mockSm = {
        get: jest.fn(() => ({
          fetchSharedFileIds: jest.fn().mockResolvedValue(new Set()),
          fetchSharedFolderIds: jest.fn().mockResolvedValue(new Set()),
          fetchUserSharedFileIds: jest.fn().mockResolvedValue(new Set()),
        }))
      };
      await service._populateSharedFlags(mergedItems, mockSm, 'tid');
      expect(mergedItems).toHaveLength(0);
    });

    it('should catch errors', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      const mockSm = { get: jest.fn(() => { throw new Error('fail'); }) };
      await service._populateSharedFlags([{ item_type: 'file', id: 'f1' }], mockSm, 'tid');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('_populateDerivativeFlags', () => {
    it('should set has_thumbnail and has_preview_pages', async () => {
      const mergedItems = [
        { item_type: 'file', id: 'f1' },
        { item_type: 'folder', folder_id: 'fold1' },
      ];
      const mockSm = {
        get: jest.fn(() => ({
          fetchFileIdsWithThumbnails: jest.fn().mockResolvedValue(new Set(['f1'])),
          fetchFileIdsWithPreviewPages: jest.fn().mockResolvedValue(new Set(['f1']))
        }))
      };
      await service._populateDerivativeFlags(mergedItems, mockSm);
      expect(mergedItems[0].has_thumbnail).toBe(true);
      expect(mergedItems[0].has_preview_pages).toBe(true);
    });

    it('should skip when no file IDs', async () => {
      const mergedItems = [{ item_type: 'folder', folder_id: 'fold1' }];
      const mockSm = { get: jest.fn() };
      await service._populateDerivativeFlags(mergedItems, mockSm);
      expect(mockSm.get).not.toHaveBeenCalled();
    });

    it('should catch errors', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      const mergedItems = [{ item_type: 'file', id: 'f1' }];
      const mockSm = { get: jest.fn(() => { throw new Error('fail'); }) };
      await service._populateDerivativeFlags(mergedItems, mockSm);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('_sortMergedItems additional', () => {
    it('should sort by owner', () => {
      const items = [
        { name: 'A', owner: 'zoe', item_type: 'file' },
        { name: 'B', created_by: 'alice', item_type: 'file' }
      ];
      service._sortMergedItems(items, 'owner');
      expect(items[0].name).toBe('B');
    });

    it('should handle folders with no size_bytes in size sort', () => {
      const items = [
        { name: 'folder', item_type: 'folder' },
        { name: 'file', size_bytes: 500, item_type: 'file' }
      ];
      service._sortMergedItems(items, 'size');
      expect(items[0].name).toBe('file');
    });

    it('should handle null names in name sort', () => {
      const items = [
        { name: null, item_type: 'file' },
        { name: 'A', item_type: 'file' }
      ];
      service._sortMergedItems(items, 'name');
      expect(items[0].name).toBeNull();
    });
  });

  describe('_buildBreadcrumbs additional', () => {
    it('should return My Drive when rootFolderId is null', () => {
      const result = service._buildBreadcrumbs('some-id', null, []);
      expect(result).toEqual([{ name: 'My Drive', folder_id: null }]);
    });

    it('should handle deep nesting', () => {
      const folders = [
        { folder_id: 'root', parent_folder_id: null, name: 'Root' },
        { folder_id: 'l1', parent_folder_id: 'root', name: 'Level 1' },
        { folder_id: 'l2', parent_folder_id: 'l1', name: 'Level 2' }
      ];
      const result = service._buildBreadcrumbs('l2', 'root', folders);
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('My Drive');
      expect(result[2].name).toBe('Level 2');
    });
  });

  describe('list (integration)', () => {
    it('should return full view data structure', async () => {
      const mockCache = { save: jest.fn(), load: jest.fn().mockResolvedValue(null) };
      service.getCache = jest.fn().mockReturnValue(mockCache);

      const mockQcs = {
        emailHash: jest.fn().mockReturnValue('hash'),
        cacheThrough: jest.fn().mockImplementation((key, fn) => fn())
      };

      const mockFolderService = {
        getRootFolderWithContext: jest.fn().mockResolvedValue({
          rootFolder: { folder_id: 'root-1', name: 'Root', toObject: () => ({ folder_id: 'root-1', name: 'Root' }) },
          user_id: 'u1',
          tenant_id: 'tid'
        }),
        getFoldersByTenant: jest.fn().mockResolvedValue([
          { folder_id: 'root-1', name: 'Root', parent_folder_id: null, toObject: () => ({ folder_id: 'root-1', name: 'Root', parent_folder_id: null }) }
        ]),
        getFoldersByParent: jest.fn().mockResolvedValue([]),
        buildFolderTree: jest.fn().mockReturnValue([]),
      };

      const mockFileMetadataService = {
        getFilesByFolderCount: jest.fn().mockResolvedValue(0),
        getFilesByFolder: jest.fn().mockResolvedValue([]),
      };

      const mockFileStarService = {
        getStarredFiles: jest.fn().mockResolvedValue([]),
      };

      const mockFolderStarService = {
        listStarred: jest.fn().mockResolvedValue([]),
      };

      const mockSm = {
        get: jest.fn((name) => {
          const map = {
            FolderService: mockFolderService,
            FileMetadataService: mockFileMetadataService,
            FolderStarService: mockFolderStarService,
            QueryCacheService: mockQcs,
            FileStarService: mockFileStarService,
            ShareLinkTable: { fetchSharedFileIds: jest.fn().mockResolvedValue(new Set()) },
            FolderShareLinkTable: { fetchSharedFolderIds: jest.fn().mockResolvedValue(new Set()) },
            FilePermissionTable: { fetchUserSharedFileIds: jest.fn().mockResolvedValue(new Set()) },
            FileDerivativeTable: { fetchFileIdsWithThumbnails: jest.fn().mockResolvedValue(new Set()), fetchFileIdsWithPreviewPages: jest.fn().mockResolvedValue(new Set()) },
          };
          return map[name] || null;
        })
      };

      service.setServiceManager(mockSm);

      const result = await service.list({
        userEmail: 'user@test.com',
        identity: { user_id: 'u1' },
        folderId: null,
        viewMode: 'my-drive',
      });

      expect(result).toHaveProperty('viewMode', 'my-drive');
      expect(result).toHaveProperty('layoutMode', 'grid');
      expect(result).toHaveProperty('sortMode', 'name');
      expect(result).toHaveProperty('folders');
      expect(result).toHaveProperty('filesList');
      expect(result).toHaveProperty('subFolders');
      expect(result).toHaveProperty('mergedItems');
      expect(result).toHaveProperty('starredFileIds');
      expect(result).toHaveProperty('starredFolderIds');
      expect(result).toHaveProperty('folderTree');
      expect(result).toHaveProperty('currentFolderId');
      expect(result).toHaveProperty('rootFolderId');
      expect(result).toHaveProperty('expandedFolderIds');
      expect(result).toHaveProperty('breadcrumbs');
    });

    it('should handle search viewMode with items to cover mergedItems mapping and annotations', async () => {
      const mockCache = { save: jest.fn(), load: jest.fn().mockResolvedValue(null) };
      service.getCache = jest.fn().mockReturnValue(mockCache);

      const mockQcs = {
        emailHash: jest.fn().mockReturnValue('hash'),
        cacheThrough: jest.fn().mockImplementation((key, fn) => fn())
      };

      const mockFolderService = {
        getRootFolderWithContext: jest.fn().mockResolvedValue({
          rootFolder: { folder_id: 'root-1', name: 'Root', toObject: () => ({ folder_id: 'root-1', name: 'Root', parent_folder_id: null }) },
          user_id: 'u1',
          tenant_id: 'tid'
        }),
        getFoldersByTenant: jest.fn().mockResolvedValue([
          { folder_id: 'root-1', name: 'Root', parent_folder_id: null, toObject: () => ({ folder_id: 'root-1', name: 'Root', parent_folder_id: null }) }
        ]),
        searchFolders: jest.fn().mockResolvedValue([
          { folder_id: 'child-1', name: 'Child', parent_folder_id: 'root-1' }
        ]),
        buildFolderTree: jest.fn().mockReturnValue([]),
      };

      const mockFileMetadataService = {
        searchFilesCount: jest.fn().mockResolvedValue(1),
        searchFiles: jest.fn().mockResolvedValue([
          { file_id: 'f1', title: 'Test File', folder_id: 'root-1', size_bytes: 100 }
        ]),
      };

      const mockFileStarService = {
        getStarredFiles: jest.fn().mockResolvedValue([]),
      };

      const mockFolderStarService = {
        listStarred: jest.fn().mockResolvedValue([]),
      };

      const mockSm = {
        get: jest.fn((name) => {
          const map = {
            FolderService: mockFolderService,
            FileMetadataService: mockFileMetadataService,
            FolderStarService: mockFolderStarService,
            QueryCacheService: mockQcs,
            FileStarService: mockFileStarService,
            ShareLinkTable: { fetchSharedFileIds: jest.fn().mockResolvedValue(new Set()) },
            FolderShareLinkTable: { fetchSharedFolderIds: jest.fn().mockResolvedValue(new Set()) },
            FilePermissionTable: { fetchUserSharedFileIds: jest.fn().mockResolvedValue(new Set()) },
            FileDerivativeTable: { fetchFileIdsWithThumbnails: jest.fn().mockResolvedValue(new Set()), fetchFileIdsWithPreviewPages: jest.fn().mockResolvedValue(new Set()) },
          };
          return map[name] || null;
        })
      };

      service.setServiceManager(mockSm);

      const result = await service.list({
        userEmail: 'user@test.com',
        identity: { user_id: 'u1' },
        folderId: null,
        viewMode: 'search',
        searchQuery: 'test query',
      });

      expect(result.viewMode).toBe('search');
      // mergedItems should have both folder and file items
      expect(result.mergedItems.length).toBeGreaterThanOrEqual(1);
      // Search annotations should have been applied
      const fileItem = result.mergedItems.find(i => i.item_type === 'file');
      if (fileItem) {
        expect(fileItem).toHaveProperty('location');
        expect(fileItem).toHaveProperty('location_path');
      }
    });

    it('should handle starred viewMode with items in list()', async () => {
      const mockCache = { save: jest.fn(), load: jest.fn().mockResolvedValue(null) };
      service.getCache = jest.fn().mockReturnValue(mockCache);

      const starredFolder = { folder_id: 'sf1', name: 'Starred Folder', toObject: () => ({ folder_id: 'sf1', name: 'Starred Folder' }) };
      const mockQcs = {
        emailHash: jest.fn().mockReturnValue('hash'),
        cacheThrough: jest.fn().mockImplementation((key, fn) => fn())
      };

      const mockFolderService = {
        getRootFolderWithContext: jest.fn().mockResolvedValue({
          rootFolder: { folder_id: 'root-1', toObject: () => ({ folder_id: 'root-1' }) },
          user_id: 'u1', tenant_id: 'tid'
        }),
        getFoldersByTenant: jest.fn().mockResolvedValue([]),
        buildFolderTree: jest.fn().mockReturnValue([]),
      };

      const mockFileMetadataService = {
        getFilesByIds: jest.fn().mockResolvedValue([
          { file_id: 'f1', title: 'Starred File', updated_dt: '2025-01-01', size_bytes: 100, document_type: 'doc' }
        ]),
      };

      const mockFolderStarService = {
        listStarred: jest.fn().mockResolvedValue([starredFolder]),
      };

      const mockSm = {
        get: jest.fn((name) => {
          const map = {
            FolderService: mockFolderService,
            FileMetadataService: mockFileMetadataService,
            FolderStarService: mockFolderStarService,
            QueryCacheService: mockQcs,
            FileStarService: { getStarredFiles: jest.fn().mockResolvedValue([{ file_id: 'f1' }]) },
            ShareLinkTable: { fetchSharedFileIds: jest.fn().mockResolvedValue(new Set()) },
            FolderShareLinkTable: { fetchSharedFolderIds: jest.fn().mockResolvedValue(new Set()) },
            FilePermissionTable: { fetchUserSharedFileIds: jest.fn().mockResolvedValue(new Set()) },
            FileDerivativeTable: { fetchFileIdsWithThumbnails: jest.fn().mockResolvedValue(new Set()), fetchFileIdsWithPreviewPages: jest.fn().mockResolvedValue(new Set()) },
          };
          return map[name] || null;
        })
      };

      service.setServiceManager(mockSm);

      const result = await service.list({
        userEmail: 'user@test.com',
        identity: { user_id: 'u1' },
        folderId: null,
        viewMode: 'starred',
      });

      expect(result.viewMode).toBe('starred');
      // starred view should resolve file details
      expect(result.filesList.length).toBe(1);
      expect(result.filesList[0].id).toBe('f1');
    });

    it('should handle folderTree build error gracefully', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      const mockCache = { save: jest.fn(), load: jest.fn().mockResolvedValue(null) };
      service.getCache = jest.fn().mockReturnValue(mockCache);

      const mockQcs = {
        emailHash: jest.fn().mockReturnValue('hash'),
        cacheThrough: jest.fn().mockImplementation((key, fn) => fn())
      };

      const mockFolderService = {
        getRootFolderWithContext: jest.fn().mockResolvedValue({
          rootFolder: { folder_id: 'root-1', toObject: () => ({ folder_id: 'root-1' }) },
          user_id: 'u1', tenant_id: 'tid'
        }),
        getFoldersByTenant: jest.fn().mockResolvedValue([]),
        getFoldersByParent: jest.fn().mockResolvedValue([]),
        buildFolderTree: jest.fn().mockImplementation(() => { throw new Error('tree error'); }),
      };

      const mockSm = {
        get: jest.fn((name) => {
          const map = {
            FolderService: mockFolderService,
            FileMetadataService: { getFilesByFolderCount: jest.fn().mockResolvedValue(0), getFilesByFolder: jest.fn().mockResolvedValue([]) },
            FolderStarService: { listStarred: jest.fn().mockResolvedValue([]) },
            QueryCacheService: mockQcs,
            FileStarService: { getStarredFiles: jest.fn().mockResolvedValue([]) },
            ShareLinkTable: { fetchSharedFileIds: jest.fn().mockResolvedValue(new Set()) },
            FolderShareLinkTable: { fetchSharedFolderIds: jest.fn().mockResolvedValue(new Set()) },
            FilePermissionTable: { fetchUserSharedFileIds: jest.fn().mockResolvedValue(new Set()) },
            FileDerivativeTable: { fetchFileIdsWithThumbnails: jest.fn().mockResolvedValue(new Set()), fetchFileIdsWithPreviewPages: jest.fn().mockResolvedValue(new Set()) },
          };
          return map[name] || null;
        })
      };
      service.setServiceManager(mockSm);

      const result = await service.list({ userEmail: 'u@t.com', identity: { user_id: 'u1' }, folderId: null });
      expect(result.folderTree).toEqual([]);
      spy.mockRestore();
    });
  });

  describe('_fetchHomeSuggestions', () => {
    function makeAdapter(opts = {}) {
      const freshnessRows = opts.freshnessRows !== undefined ? opts.freshnessRows : [{ last_generated: null }];
      const folderRows = opts.folderRows || [];
      const fileRows = opts.fileRows || [];
      let callCount = 0;

      return {
        query: jest.fn().mockImplementation((sql) => {
          if (sql.includes('MAX(generated_dt)')) return Promise.resolve({ rows: freshnessRows });
          if (sql.includes('DELETE FROM user_suggestion_cache')) return Promise.resolve({ rows: [] });
          if (sql.includes("asset_type = 'folder'")) return Promise.resolve({ rows: folderRows });
          if (sql.includes("asset_type = 'file'")) return Promise.resolve({ rows: fileRows });
          // refresh queries (folder/file selection + inserts)
          if (sql.includes('FROM folder f')) return Promise.resolve({ rows: [] });
          if (sql.includes('FROM file_metadata fm')) return Promise.resolve({ rows: [] });
          if (sql.includes('INSERT INTO user_suggestion_cache')) return Promise.resolve({ rows: [] });
          return Promise.resolve({ rows: [] });
        })
      };
    }

    function makeSmWithAdapter(adapter) {
      return {
        get: jest.fn((name) => {
          if (name === 'DbAdapter') return adapter;
          if (name === 'ShareLinkTable') return { fetchSharedFileIds: jest.fn().mockResolvedValue(new Set()) };
          if (name === 'FolderShareLinkTable') return { fetchSharedFolderIds: jest.fn().mockResolvedValue(new Set()) };
          if (name === 'FilePermissionTable') return { fetchUserSharedFileIds: jest.fn().mockResolvedValue(new Set()) };
          return null;
        })
      };
    }

    it('returns empty when userId is null', async () => {
      const result = await service._fetchHomeSuggestions(null, 't1');
      expect(result).toEqual({ folders: [], files: [] });
    });

    it('returns empty when tenantId is null', async () => {
      const result = await service._fetchHomeSuggestions('u1', null);
      expect(result).toEqual({ folders: [], files: [] });
    });

    it('returns empty when both are null', async () => {
      const result = await service._fetchHomeSuggestions(null, null);
      expect(result).toEqual({ folders: [], files: [] });
    });

    it('calls _refreshSuggestionCache when cache is stale (no last_generated)', async () => {
      const adapter = makeAdapter({ freshnessRows: [{ last_generated: null }] });
      const mockSm = makeSmWithAdapter(adapter);
      service.setServiceManager(mockSm);

      const result = await service._fetchHomeSuggestions('u1', 't1');

      expect(result).toHaveProperty('folders');
      expect(result).toHaveProperty('files');
      // Verify refresh was called (DELETE + folder/file SELECT queries)
      const calls = adapter.query.mock.calls.map(c => c[0]);
      expect(calls.some(sql => sql.includes('DELETE FROM user_suggestion_cache'))).toBe(true);
    });

    it('skips refresh when cache is fresh', async () => {
      const recentDate = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 min ago
      const adapter = makeAdapter({ freshnessRows: [{ last_generated: recentDate }] });
      const mockSm = makeSmWithAdapter(adapter);
      service.setServiceManager(mockSm);

      await service._fetchHomeSuggestions('u1', 't1');

      const calls = adapter.query.mock.calls.map(c => c[0]);
      expect(calls.some(sql => sql.includes('DELETE FROM user_suggestion_cache'))).toBe(false);
    });

    it('returns mapped folder and file results from cache', async () => {
      const recentDate = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const adapter = {
        query: jest.fn().mockImplementation((sql) => {
          if (sql.includes('MAX(generated_dt)')) return Promise.resolve({ rows: [{ last_generated: recentDate }] });
          if (sql.includes("asset_type = 'folder'")) return Promise.resolve({ rows: [
            { folder_id: 'f1', name: 'Docs', parent_folder_id: null, updated_dt: null, score: '50' }
          ]});
          if (sql.includes("asset_type = 'file'")) return Promise.resolve({ rows: [
            { file_id: 'file1', title: 'Report', content_type: 'pdf', size_bytes: 100, folder_id: 'f1', updated_dt: null, created_dt: null, score: '30', visibility: 'private' }
          ]});
          return Promise.resolve({ rows: [] });
        })
      };
      const mockSm = makeSmWithAdapter(adapter);
      service.setServiceManager(mockSm);

      const result = await service._fetchHomeSuggestions('u1', 't1');

      expect(result.folders).toHaveLength(1);
      expect(result.folders[0]).toMatchObject({ folder_id: 'f1', name: 'Docs', item_type: 'folder', score: 50 });
      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toMatchObject({ file_id: 'file1', item_type: 'file', score: 30 });
    });

    it('returns empty arrays and logs error on exception', async () => {
      const adapter = {
        query: jest.fn().mockRejectedValue(new Error('DB error'))
      };
      const mockSm = makeSmWithAdapter(adapter);
      service.setServiceManager(mockSm);

      const spy = jest.spyOn(console, 'error').mockImplementation();
      const result = await service._fetchHomeSuggestions('u1', 't1');
      spy.mockRestore();

      expect(result).toEqual({ folders: [], files: [] });
    });
  });

  describe('_refreshSuggestionCache', () => {
    it('inserts folder and file rows into cache', async () => {
      const insertCalls = [];
      const adapter = {
        query: jest.fn().mockImplementation((sql, params) => {
          if (sql.includes('INSERT INTO user_suggestion_cache')) insertCalls.push({ sql, params });
          return Promise.resolve({ rows: [] });
        })
      };

      // Override to return folder and file rows
      adapter.query
        .mockImplementationOnce(() => Promise.resolve({ rows: [{ folder_id: 'f1', score: 80, reason: {} }] })) // folders
        .mockImplementationOnce(() => Promise.resolve({ rows: [{ file_id: 'file1', score: 60, reason: {} }] })) // files
        .mockImplementation(() => Promise.resolve({ rows: [] })); // DELETE + INSERTs

      await service._refreshSuggestionCache(adapter, 'u1', 't1');

      // Should have called DELETE + 2 INSERTs (1 folder + 1 file)
      const allCalls = adapter.query.mock.calls.map(c => c[0]);
      expect(allCalls.some(sql => sql.includes('DELETE FROM user_suggestion_cache'))).toBe(true);
      expect(allCalls.filter(sql => sql.includes('INSERT INTO user_suggestion_cache')).length).toBe(2);
    });

    it('handles empty folder and file results', async () => {
      const adapter = {
        query: jest.fn().mockResolvedValue({ rows: [] })
      };

      await service._refreshSuggestionCache(adapter, 'u1', 't1');

      const allCalls = adapter.query.mock.calls.map(c => c[0]);
      expect(allCalls.some(sql => sql.includes('DELETE FROM user_suggestion_cache'))).toBe(true);
      // No inserts when no rows
      expect(allCalls.filter(sql => sql.includes('INSERT INTO user_suggestion_cache')).length).toBe(0);
    });
  });
});
