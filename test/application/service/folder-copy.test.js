const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FolderService = require(globalThis.applicationPath(
  '/application/service/domain/folder-domain-service'
));

function createService(opts = {}) {
  const svc = new FolderService();

  const folders = opts.folders || {
    'src-folder': { name: 'Source', tenant_id: 't1', parent_folder_id: 'root' },
    'dest-parent': { name: 'Destination', tenant_id: 't1', parent_folder_id: 'root' }
  };

  const childFolders = opts.childFolders || {};
  const childFiles = opts.childFiles || {};
  const createdFolders = [];
  const copiedFiles = [];
  const eventsLogged = [];
  let createCounter = 0;

  const mockFolderTable = {
    fetchById: async (id) => {
      if (!folders[id]) return null;
      const f = folders[id];
      return {
        getFolderId: () => id,
        getName: () => f.name,
        getTenantId: () => f.tenant_id,
        getParentFolderId: () => f.parent_folder_id
      };
    },
    create: async (data) => {
      createCounter++;
      const newId = 'new-folder-' + createCounter;
      createdFolders.push({ ...data, newId });
      // Register so recursive calls can fetchById on newly created folders
      folders[newId] = { name: data.name, tenant_id: data.tenant_id, parent_folder_id: data.parent_folder_id };
      return newId;
    },
    fetchByParent: async (parentId) => {
      return (childFolders[parentId] || []).map(c => ({
        getFolderId: () => c.id,
        getName: () => c.name,
        getTenantId: () => 't1'
      }));
    }
  };

  const mockFileTable = {
    fetchFilesByFolder: async (email, folderId) => {
      return childFiles[folderId] || [];
    }
  };

  const mockFileService = {
    copyFile: async (fileId, targetFolderId, email) => {
      copiedFiles.push({ fileId, targetFolderId, email });
      return { file_id: 'new-' + fileId };
    }
  };

  const mockAppUserTable = {
    resolveByEmail: async () => ({ user_id: 'u1', tenant_id: 't1' })
  };
  const mockFolderEventTable = { insertEvent: async () => {} };

  svc.logEvent = async (id, type, detail, userId) => {
    eventsLogged.push({ id, type, detail, userId });
  };

  svc._invalidateFolderCache = () => {};

  const mockSm = {
    get: (name) => {
      if (name === 'FileMetadataService') return mockFileService;
      if (name === 'QueryCacheService') return { onFolderChanged: async () => {}, onFileChanged: async () => {} };
      if (name === 'DbAdapter') return { query: jest.fn().mockResolvedValue({}) };
      return null;
    }
  };
  svc.getServiceManager = () => mockSm;
  svc.serviceManager = mockSm;
  svc.table['FolderTable'] = mockFolderTable;
  svc.table['AppUserTable'] = mockAppUserTable;
  svc.table['FileMetadataTable'] = mockFileTable;
  svc.table['FolderEventTable'] = mockFolderEventTable;

  return { svc, createdFolders, copiedFiles, eventsLogged };
}

describe('FolderService.copyFolder()', () => {
  it('copies a folder to the target parent', async () => {
    const { svc, createdFolders } = createService();
    const newId = await svc.copyFolder('src-folder', 'dest-parent', 'test@example.com');

    expect(newId).toBe('new-folder-1');
    expect(createdFolders).toHaveLength(1);
    expect(createdFolders[0].parent_folder_id).toBe('dest-parent');
    expect(createdFolders[0].name).toBe('Source');
    expect(createdFolders[0].tenant_id).toBe('t1');
    expect(createdFolders[0].created_by).toBe('u1');
  });

  it('recursively copies child folders', async () => {
    const { svc, createdFolders } = createService({
      folders: {
        'src-folder': { name: 'Source', tenant_id: 't1', parent_folder_id: 'root' },
        'child-a': { name: 'Child A', tenant_id: 't1', parent_folder_id: 'src-folder' },
        'dest-parent': { name: 'Dest', tenant_id: 't1', parent_folder_id: 'root' }
      },
      childFolders: {
        'src-folder': [{ id: 'child-a', name: 'Child A' }]
      }
    });

    await svc.copyFolder('src-folder', 'dest-parent', 'test@example.com');

    // Should create 2 folders: src-folder copy + child-a copy
    expect(createdFolders).toHaveLength(2);
    expect(createdFolders[0].name).toBe('Source');
    expect(createdFolders[1].name).toBe('Child A');
    expect(createdFolders[1].parent_folder_id).toBe('new-folder-1');
  });

  it('copies files inside the folder', async () => {
    const { svc, copiedFiles } = createService({
      childFiles: {
        'src-folder': [{ file_id: 'file-1' }, { file_id: 'file-2' }]
      }
    });

    const newId = await svc.copyFolder('src-folder', 'dest-parent', 'test@example.com');

    expect(copiedFiles).toHaveLength(2);
    expect(copiedFiles[0].fileId).toBe('file-1');
    expect(copiedFiles[0].targetFolderId).toBe(newId);
    expect(copiedFiles[1].fileId).toBe('file-2');
  });

  it('logs COPIED event', async () => {
    const { svc, eventsLogged } = createService();
    await svc.copyFolder('src-folder', 'dest-parent', 'test@example.com');

    expect(eventsLogged).toHaveLength(1);
    expect(eventsLogged[0].type).toBe('COPIED');
    expect(eventsLogged[0].detail.source_folder_id).toBe('src-folder');
    expect(eventsLogged[0].detail.target_parent_id).toBe('dest-parent');
  });

  it('throws when source folder not found', async () => {
    const { svc } = createService();
    await expect(svc.copyFolder('nonexistent', 'dest-parent', 'test@example.com'))
      .rejects.toThrow('Folder not found');
  });

  it('throws when target parent folder not found', async () => {
    const { svc } = createService();
    await expect(svc.copyFolder('src-folder', 'nonexistent', 'test@example.com'))
      .rejects.toThrow('Target parent folder not found');
  });

  it('throws when source folder has different tenant', async () => {
    const { svc } = createService({
      folders: {
        'other-tenant-folder': { name: 'Other', tenant_id: 'other-t', parent_folder_id: null },
        'dest-parent': { name: 'Dest', tenant_id: 't1', parent_folder_id: 'root' }
      }
    });
    await expect(svc.copyFolder('other-tenant-folder', 'dest-parent', 'test@example.com'))
      .rejects.toThrow('Access denied');
  });

  it('throws when target parent has different tenant', async () => {
    const { svc } = createService({
      folders: {
        'src-folder': { name: 'Source', tenant_id: 't1', parent_folder_id: 'root' },
        'other-dest': { name: 'Other Dest', tenant_id: 'other-t', parent_folder_id: null }
      }
    });
    await expect(svc.copyFolder('src-folder', 'other-dest', 'test@example.com'))
      .rejects.toThrow('Access denied to target folder');
  });

  it('handles empty folder (no children, no files)', async () => {
    const { svc, createdFolders, copiedFiles } = createService();
    await svc.copyFolder('src-folder', 'dest-parent', 'test@example.com');

    expect(createdFolders).toHaveLength(1);
    expect(copiedFiles).toHaveLength(0);
  });
});
