const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const FileMetadataService = require(globalThis.applicationPath(
  '/application/service/domain/file-metadata-domain-service'
));

function createService(opts = {}) {
  const svc = new FileMetadataService();

  const file = opts.file || {
    getTenantId: () => 't1',
    getFolderId: () => 'original-folder'
  };

  const updates = [];
  const events = [];

  const mockTable = {
    fetchById: async (id) => {
      if (id === 'nonexistent') return null;
      if (id === 'other-tenant-file') return { getTenantId: () => 'other', getFolderId: () => 'f' };
      return file;
    },
    update: async (where, data) => { updates.push({ where, data }); }
  };

  const mockFolderTable = {
    fetchById: async (id) => {
      if (id === 'nonexistent-folder') return null;
      if (id === 'other-tenant-folder') return { getTenantId: () => 'other' };
      return { getTenantId: () => 't1', getFolderId: () => id };
    }
  };

  const mockEventTable = {
    insertEvent: async (fileId, type, detail, userId) => {
      events.push({ fileId, type, detail, userId });
    }
  };

  svc.getServiceManager = () => ({
    get: (name) => {
      if (name === 'AppUserTable') return { resolveByEmail: async () => ({ user_id: 'u1', tenant_id: 't1' }) };
      if (name === 'FolderTable') return mockFolderTable;
      if (name === 'FileEventTable') return mockEventTable;
      if (name === 'QueryCacheService') return { onFileChanged: async () => {} };
      if (name === 'DbAdapter') return { query: jest.fn().mockResolvedValue({}) };
      return null;
    }
  });

  svc.getTable = async (name) => {
    if (name === 'FileMetadataTable') return mockTable;
    return null;
  };

  svc._invalidateFileCache = () => {};
  svc._now = () => new Date('2026-03-12T10:00:00Z');

  return { svc, updates, events };
}

describe('FileMetadataService.moveFile()', () => {
  it('updates folder_id to the target folder', async () => {
    const { svc, updates } = createService();

    await svc.moveFile('file-1', 'target-folder', 'user@example.com');

    expect(updates).toHaveLength(1);
    expect(updates[0].where).toEqual({ file_id: 'file-1' });
    expect(updates[0].data.folder_id).toBe('target-folder');
  });

  it('sets updated_by to the acting user', async () => {
    const { svc, updates } = createService();

    await svc.moveFile('file-1', 'target-folder', 'user@example.com');

    expect(updates[0].data.updated_by).toBe('u1');
  });

  it('sets updated_dt on the record', async () => {
    const { svc, updates } = createService();

    await svc.moveFile('file-1', 'target-folder', 'user@example.com');

    expect(updates[0].data.updated_dt).toBeDefined();
  });

  it('logs a MOVED event with from and to folder IDs', async () => {
    const { svc, events } = createService();

    await svc.moveFile('file-1', 'target-folder', 'user@example.com');

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('MOVED');
    expect(events[0].detail.from_folder_id).toBe('original-folder');
    expect(events[0].detail.to_folder_id).toBe('target-folder');
    expect(events[0].fileId).toBe('file-1');
    expect(events[0].userId).toBe('u1');
  });

  it('returns true on success', async () => {
    const { svc } = createService();

    const result = await svc.moveFile('file-1', 'target-folder', 'user@example.com');

    expect(result).toBe(true);
  });

  it('throws when file does not exist', async () => {
    const { svc } = createService();

    await expect(svc.moveFile('nonexistent', 'target-folder', 'user@example.com'))
      .rejects.toThrow('File not found');
  });

  it('throws when file belongs to a different tenant', async () => {
    const { svc } = createService();

    await expect(svc.moveFile('other-tenant-file', 'target-folder', 'user@example.com'))
      .rejects.toThrow('Access denied');
  });

  it('throws when target folder does not exist', async () => {
    const { svc } = createService();

    await expect(svc.moveFile('file-1', 'nonexistent-folder', 'user@example.com'))
      .rejects.toThrow('Destination folder not found');
  });

  it('throws when target folder belongs to a different tenant', async () => {
    const { svc } = createService();

    await expect(svc.moveFile('file-1', 'other-tenant-folder', 'user@example.com'))
      .rejects.toThrow('Access denied to destination folder');
  });
});
