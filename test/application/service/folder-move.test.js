const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const FolderService = require(globalThis.applicationPath(
  '/application/service/domain/folder-domain-service'
));

function makeFolder(id, parentId, tenantId = 't1') {
  return {
    getFolderId: () => id,
    getTenantId: () => tenantId,
    getParentFolderId: () => parentId,
    getName: () => 'Folder ' + id
  };
}

function createService(opts = {}) {
  const svc = new FolderService();

  const updates = [];
  const events = [];

  const folderMap = {
    'folder-1':   makeFolder('folder-1', 'root'),
    'folder-2':   makeFolder('folder-2', 'root'),
    'child-1':    makeFolder('child-1', 'folder-1'),
    'root':       makeFolder('root', null),           // root — no parent
    'other-tenant-folder': makeFolder('other-tenant-folder', 'root', 'other'),
    ...(opts.extraFolders || {})
  };

  // By default, isDescendantOf returns false (no cycle)
  const descendantResult = opts.descendantResult !== undefined ? opts.descendantResult : false;

  const mockFolderTable = {
    fetchById: async (id) => folderMap[id] || null,
    update: async (where, data) => { updates.push({ where, data }); },
    isDescendantOf: async () => descendantResult
  };

  const mockEventTable = {
    insertEvent: async (folderId, type, detail, userId) => {
      events.push({ folderId, type, detail, userId });
    }
  };

  svc.getServiceManager = () => ({
    get: (name) => {
      if (name === 'AppUserTable') return { resolveByEmail: async () => ({ user_id: 'u1', tenant_id: 't1' }) };
      if (name === 'FolderEventTable') return mockEventTable;
      if (name === 'QueryCacheService') return { onFolderChanged: async () => {} };
      if (name === 'DbAdapter') return { query: jest.fn().mockResolvedValue({}) };
      return null;
    }
  });

  svc.getTable = (name) => {
    if (name === 'FolderTable') return mockFolderTable;
    return null;
  };

  svc._invalidateFolderCache = () => {};

  return { svc, updates, events };
}

describe('FolderService.moveFolder()', () => {
  it('updates parent_folder_id to the target parent', async () => {
    const { svc, updates } = createService();

    await svc.moveFolder('folder-1', 'folder-2', 'user@example.com');

    expect(updates).toHaveLength(1);
    expect(updates[0].where).toEqual({ folder_id: 'folder-1' });
    expect(updates[0].data.parent_folder_id).toBe('folder-2');
  });

  it('sets updated_by on the folder record', async () => {
    const { svc, updates } = createService();

    await svc.moveFolder('folder-1', 'folder-2', 'user@example.com');

    expect(updates[0].data.updated_by).toBe('u1');
  });

  it('logs a MOVED event with from and to parent folder IDs', async () => {
    const { svc, events } = createService();

    await svc.moveFolder('folder-1', 'folder-2', 'user@example.com');

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('MOVED');
    expect(events[0].folderId).toBe('folder-1');
    expect(events[0].detail.from_parent_folder_id).toBe('root');
    expect(events[0].detail.to_parent_folder_id).toBe('folder-2');
    expect(events[0].userId).toBe('u1');
  });

  it('returns true on success', async () => {
    const { svc } = createService();

    const result = await svc.moveFolder('folder-1', 'folder-2', 'user@example.com');

    expect(result).toBe(true);
  });

  it('throws when source folder does not exist', async () => {
    const { svc } = createService();

    await expect(svc.moveFolder('nonexistent', 'folder-2', 'user@example.com'))
      .rejects.toThrow('Folder not found');
  });

  it('throws when trying to move root folder', async () => {
    const { svc } = createService();

    await expect(svc.moveFolder('root', 'folder-2', 'user@example.com'))
      .rejects.toThrow('Cannot move root folder');
  });

  it('throws when source folder belongs to a different tenant', async () => {
    const { svc } = createService();

    await expect(svc.moveFolder('other-tenant-folder', 'folder-2', 'user@example.com'))
      .rejects.toThrow('Access denied');
  });

  it('throws when target folder does not exist', async () => {
    const { svc } = createService();

    await expect(svc.moveFolder('folder-1', 'nonexistent', 'user@example.com'))
      .rejects.toThrow('Target parent folder not found');
  });

  it('throws when target folder belongs to a different tenant', async () => {
    const { svc } = createService();

    await expect(svc.moveFolder('folder-1', 'other-tenant-folder', 'user@example.com'))
      .rejects.toThrow('Access denied to target folder');
  });

  it('throws when moving a folder into itself', async () => {
    const { svc } = createService();

    await expect(svc.moveFolder('folder-1', 'folder-1', 'user@example.com'))
      .rejects.toThrow('Cannot move a folder into itself');
  });

  it('throws when moving a folder into one of its own descendants (cyclic)', async () => {
    const { svc } = createService({ descendantResult: true });

    await expect(svc.moveFolder('folder-1', 'child-1', 'user@example.com'))
      .rejects.toThrow('Cannot move a folder into one of its subfolders');
  });
});
