const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FolderBreadcrumbController = require(globalThis.applicationPath(
  '/application/module/admin/controller/rest/folder-breadcrumb-controller'
));

/**
 * Creates a mock controller instance with stubbed dependencies.
 */
function createController(opts = {}) {
  const ctrl = Object.create(FolderBreadcrumbController.prototype);

  const folders = opts.folders || [
    { folder_id: 'root', name: 'Root', parent_folder_id: null },
    { folder_id: 'docs', name: 'Documents', parent_folder_id: 'root' },
    { folder_id: 'sub', name: 'Subfolder', parent_folder_id: 'docs' }
  ];

  const rootFolderId = opts.rootFolderId || 'root';

  // Mock requireUserContext
  ctrl.requireUserContext = async () => ({
    email: 'test@example.com',
    user_id: 'u1',
    tenant_id: 't1'
  });

  // Mock getRequest
  ctrl.getRequest = () => ({
    getPost: (key) => {
      if (key === 'folderId') return opts.folderId || null;
      return null;
    }
  });

  // Mock ok response
  ctrl.ok = (data) => data;

  // Mock getSm
  ctrl.getSm = () => ({
    get: (name) => {
      if (name === 'QueryCacheService') {
        return {
          emailHash: () => 'abc123',
          cacheThrough: async (key, fn) => {
            if (key.startsWith('folders:all:')) return folders;
            if (key.startsWith('folders:root:')) {
              return {
                rootFolder: { folder_id: rootFolderId },
                user_id: 'u1',
                tenant_id: 't1'
              };
            }
            return fn();
          }
        };
      }
      if (name === 'FolderService') {
        return {
          getFoldersByTenant: async () => folders,
          getRootFolderWithContext: async () => ({
            rootFolder: { folder_id: rootFolderId, toObject: () => ({ folder_id: rootFolderId }) },
            user_id: 'u1',
            tenant_id: 't1'
          })
        };
      }
      return null;
    }
  });

  return ctrl;
}

describe('FolderBreadcrumbController', () => {
  describe('postAction()', () => {
    it('returns breadcrumbs for a valid folder ID', async () => {
      const ctrl = createController({ folderId: 'sub' });
      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.breadcrumbs).toEqual([
        { name: 'My Drive', folder_id: 'root' },
        { name: 'Documents', folder_id: 'docs' },
        { name: 'Subfolder', folder_id: 'sub' }
      ]);
    });

    it('returns breadcrumbs for root folder', async () => {
      const ctrl = createController({ folderId: 'root' });
      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.breadcrumbs).toEqual([
        { name: 'My Drive', folder_id: 'root' }
      ]);
    });

    it('returns breadcrumbs for docs folder', async () => {
      const ctrl = createController({ folderId: 'docs' });
      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.breadcrumbs).toEqual([
        { name: 'My Drive', folder_id: 'root' },
        { name: 'Documents', folder_id: 'docs' }
      ]);
    });

    it('returns empty breadcrumbs when folderId is missing', async () => {
      const ctrl = createController({ folderId: null });
      const result = await ctrl.postAction();

      expect(result.success).toBe(false);
      expect(result.breadcrumbs).toEqual([]);
    });

    it('returns empty breadcrumbs for unknown folder ID', async () => {
      const ctrl = createController({ folderId: 'nonexistent' });
      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.breadcrumbs).toEqual([]);
    });

    it('replaces root folder name with My Drive', async () => {
      const ctrl = createController({ folderId: 'root' });
      const result = await ctrl.postAction();

      expect(result.breadcrumbs[0].name).toBe('My Drive');
    });

    it('handles deeply nested folders', async () => {
      const deepFolders = [
        { folder_id: 'root', name: 'Root', parent_folder_id: null },
        { folder_id: 'a', name: 'Level A', parent_folder_id: 'root' },
        { folder_id: 'b', name: 'Level B', parent_folder_id: 'a' },
        { folder_id: 'c', name: 'Level C', parent_folder_id: 'b' },
        { folder_id: 'd', name: 'Level D', parent_folder_id: 'c' }
      ];
      const ctrl = createController({ folderId: 'd', folders: deepFolders });
      const result = await ctrl.postAction();

      expect(result.success).toBe(true);
      expect(result.breadcrumbs).toHaveLength(5);
      expect(result.breadcrumbs[0].name).toBe('My Drive');
      expect(result.breadcrumbs[4].name).toBe('Level D');
    });

    it('calls toObject() on folder entities when cacheThrough invokes fn', async () => {
      // Make cacheThrough always invoke fn() so the map/toObject path is covered
      const ctrl = Object.create(FolderBreadcrumbController.prototype);
      ctrl.requireUserContext = async () => ({ email: 'test@example.com', user_id: 'u1', tenant_id: 't1' });
      ctrl.getRequest = () => ({ getPost: (key) => key === 'folderId' ? 'sub' : null });
      ctrl.ok = (data) => data;

      const folderEntities = [
        { folder_id: 'root', name: 'Root', parent_folder_id: null },
        { folder_id: 'docs', name: 'Documents', parent_folder_id: 'root' },
        { folder_id: 'sub', name: 'Subfolder', parent_folder_id: 'docs' }
      ].map(f => ({ toObject: () => f }));

      const rootFolderEntity = {
        folder_id: 'root',
        toObject: () => ({ folder_id: 'root', name: 'Root', parent_folder_id: null })
      };

      ctrl.getSm = () => ({
        get: (name) => {
          if (name === 'QueryCacheService') {
            return {
              emailHash: () => 'abc123',
              // Always call fn() so inline lambdas execute (covering toObject branches)
              cacheThrough: async (key, fn) => fn()
            };
          }
          if (name === 'FolderService') {
            return {
              getFoldersByTenant: async () => folderEntities,
              getRootFolderWithContext: async () => ({
                rootFolder: rootFolderEntity,
                user_id: 'u1',
                tenant_id: 't1'
              })
            };
          }
          return null;
        }
      });

      const result = await ctrl.postAction();
      expect(result.success).toBe(true);
      expect(result.breadcrumbs).toHaveLength(3);
      expect(result.breadcrumbs[0].name).toBe('My Drive');
    });

    it('handles rootFolder being null in rootCtx (covers null branch on L50)', async () => {
      const ctrl = Object.create(FolderBreadcrumbController.prototype);
      ctrl.requireUserContext = async () => ({ email: 'test@example.com', user_id: 'u1', tenant_id: 't1' });
      ctrl.getRequest = () => ({ getPost: (key) => key === 'folderId' ? 'docs' : null });
      ctrl.ok = (data) => data;

      const plainFolders = [
        { folder_id: 'root', name: 'Root', parent_folder_id: null },
        { folder_id: 'docs', name: 'Documents', parent_folder_id: 'root' }
      ];

      ctrl.getSm = () => ({
        get: (name) => {
          if (name === 'QueryCacheService') {
            return {
              emailHash: () => 'abc123',
              cacheThrough: async (key, fn) => {
                if (key.startsWith('folders:all:')) return plainFolders;
                // Return rootCtx with rootFolder as null
                if (key.startsWith('folders:root:')) return { rootFolder: null, user_id: 'u1', tenant_id: 't1' };
                return fn();
              }
            };
          }
          if (name === 'FolderService') {
            return {
              getFoldersByTenant: async () => plainFolders,
              getRootFolderWithContext: async () => ({ rootFolder: null, user_id: 'u1', tenant_id: 't1' })
            };
          }
          return null;
        }
      });

      const result = await ctrl.postAction();
      expect(result.success).toBe(true);
      // Root name won't be replaced since rootFolderId is null
      expect(result.breadcrumbs[0].name).toBe('Root');
    });

    it('catches errors and returns empty breadcrumbs (covers catch block)', async () => {
      const ctrl = Object.create(FolderBreadcrumbController.prototype);
      ctrl.requireUserContext = async () => { throw new Error('Auth failed'); };
      ctrl.getRequest = () => ({ getPost: () => 'sub' });
      ctrl.ok = (data) => data;
      ctrl.getSm = () => ({ get: () => null });

      const result = await ctrl.postAction();

      expect(result.success).toBe(false);
      expect(result.breadcrumbs).toEqual([]);
    });
  });
});
