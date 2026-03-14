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

  const folderUpdates = [];
  const fileUpdates = [];
  const folderEvents = [];
  const fileEvents = [];

  // Folder tree: root-folder → child-folder → grandchild-folder
  const folderMap = {
    'root-folder':  makeFolder('root-folder', null),         // root — no parent
    'folder-1':     makeFolder('folder-1', 'root-folder'),
    'child-folder': makeFolder('child-folder', 'folder-1'),
    'grandchild':   makeFolder('grandchild', 'child-folder'),
    'other-tenant': makeFolder('other-tenant', 'root-folder', 'other'),
    ...(opts.extraFolders || {})
  };

  const childrenMap = opts.childrenMap || {
    'folder-1':     [folderMap['child-folder']],
    'child-folder': [folderMap['grandchild']],
    'grandchild':   []
  };

  const filesMap = opts.filesMap || {
    'folder-1':     [{ id: 'file-a' }],
    'child-folder': [{ id: 'file-b' }],
    'grandchild':   []
  };

  const mockFolderTable = {
    fetchById: async (id) => folderMap[id] || null,
    fetchByParent: async (parentId) => childrenMap[parentId] || [],
    update: async (where, data) => { folderUpdates.push({ where, data }); }
  };

  const mockFileTable = {
    fetchFilesByFolder: async (email, folderId) => filesMap[folderId] || [],
    update: async (where, data) => { fileUpdates.push({ where, data }); },
    hasFilesByFolder: async () => false
  };

  const mockFolderEventTable = {
    insertEvent: async (folderId, type, detail, userId) => {
      folderEvents.push({ folderId, type, detail, userId });
    }
  };

  const mockFileEventTable = {
    insertEvent: async (fileId, type, detail, userId) => {
      fileEvents.push({ fileId, type, detail, userId });
    }
  };

  const mockAppUserTable = { resolveByEmail: async () => ({ user_id: 'u1', tenant_id: 't1' }) };

  const mockSm = {
    get: (name) => {
      return null;
    }
  };
  svc.getServiceManager = () => mockSm;
  svc.serviceManager = mockSm;
  svc.table['FolderTable'] = mockFolderTable;
  svc.table['AppUserTable'] = mockAppUserTable;
  svc.table['FileMetadataTable'] = mockFileTable;
  svc.table['FolderEventTable'] = mockFolderEventTable;
  svc.table['FileEventTable'] = mockFileEventTable;

  svc._invalidateFolderCache = () => {};

  return { svc, folderUpdates, fileUpdates, folderEvents, fileEvents };
}

describe('FolderService.trashFolder()', () => {
  it('soft-deletes the folder itself', async () => {
    const { svc, folderUpdates } = createService({
      childrenMap: { 'folder-1': [] },
      filesMap: { 'folder-1': [] }
    });

    await svc.trashFolder('folder-1', 'user@example.com');

    const folderUpdate = folderUpdates.find(u => u.where.folder_id === 'folder-1');
    expect(folderUpdate).toBeDefined();
    expect(folderUpdate.data.deleted_at).toBeDefined();
    expect(folderUpdate.data.deleted_by).toBe('u1');
  });

  it('logs a DELETED event for the folder', async () => {
    const { svc, folderEvents } = createService({
      childrenMap: { 'folder-1': [] },
      filesMap: { 'folder-1': [] }
    });

    await svc.trashFolder('folder-1', 'user@example.com');

    expect(folderEvents).toHaveLength(1);
    expect(folderEvents[0].type).toBe('DELETED');
    expect(folderEvents[0].folderId).toBe('folder-1');
    expect(folderEvents[0].detail).toEqual({ delete_type: 'soft' });
  });

  it('soft-deletes files within the folder', async () => {
    const { svc, fileUpdates } = createService({
      childrenMap: { 'folder-1': [] },
      filesMap: { 'folder-1': [{ id: 'file-a' }, { id: 'file-b' }] }
    });

    await svc.trashFolder('folder-1', 'user@example.com');

    const trashedFileIds = fileUpdates.map(u => u.where.file_id);
    expect(trashedFileIds).toContain('file-a');
    expect(trashedFileIds).toContain('file-b');
  });

  it('recursively trashes child folders and their files', async () => {
    const { svc, folderUpdates, fileUpdates } = createService();

    await svc.trashFolder('folder-1', 'user@example.com');

    const trashedFolderIds = folderUpdates.map(u => u.where.folder_id);
    expect(trashedFolderIds).toContain('folder-1');
    expect(trashedFolderIds).toContain('child-folder');
    expect(trashedFolderIds).toContain('grandchild');

    const trashedFileIds = fileUpdates.map(u => u.where.file_id);
    expect(trashedFileIds).toContain('file-a');
    expect(trashedFileIds).toContain('file-b');
  });

  it('logs DELETED events for each trashed folder', async () => {
    const { svc, folderEvents } = createService();

    await svc.trashFolder('folder-1', 'user@example.com');

    const trashedFolderIds = folderEvents.map(e => e.folderId);
    expect(trashedFolderIds).toContain('folder-1');
    expect(trashedFolderIds).toContain('child-folder');
    expect(trashedFolderIds).toContain('grandchild');
    expect(folderEvents.every(e => e.type === 'DELETED')).toBe(true);
  });

  it('logs DELETED events for files with trashed_with_folder reference', async () => {
    const { svc, fileEvents } = createService({
      childrenMap: { 'folder-1': [] },
      filesMap: { 'folder-1': [{ id: 'file-a' }] }
    });

    await svc.trashFolder('folder-1', 'user@example.com');

    expect(fileEvents[0].type).toBe('DELETED');
    expect(fileEvents[0].detail.trashed_with_folder).toBe('folder-1');
    expect(fileEvents[0].detail.delete_type).toBe('soft');
  });

  it('throws when folder does not exist', async () => {
    const { svc } = createService();

    await expect(svc.trashFolder('nonexistent', 'user@example.com'))
      .rejects.toThrow('Folder not found');
  });

  it('throws when trying to trash root folder', async () => {
    const { svc } = createService();

    await expect(svc.trashFolder('root-folder', 'user@example.com'))
      .rejects.toThrow('Cannot trash root folder');
  });

  it('throws when folder belongs to a different tenant', async () => {
    const { svc } = createService();

    await expect(svc.trashFolder('other-tenant', 'user@example.com'))
      .rejects.toThrow('Access denied');
  });

  it('trashes an empty folder without errors', async () => {
    const { svc, folderUpdates } = createService({
      childrenMap: { 'folder-1': [] },
      filesMap: { 'folder-1': [] }
    });

    await expect(svc.trashFolder('folder-1', 'user@example.com')).resolves.toBe(true);
    expect(folderUpdates).toHaveLength(1);
  });
});
