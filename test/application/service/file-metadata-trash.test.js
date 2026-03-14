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
    getFolderId: () => 'folder-1'
  };

  const updates = [];
  const events = [];

  const mockTable = {
    fetchById: async (id) => {
      if (id === 'nonexistent') return null;
      if (id === 'other-tenant-file') return { getTenantId: () => 'other', getFolderId: () => 'f' };
      return file;
    },
    fetchByIdIncludeDeleted: async (id) => {
      if (id === 'nonexistent') return null;
      return opts.deletedFile || { ...file, getDeletedAt: () => new Date('2026-01-01'), getTenantId: () => 't1' };
    },
    update: async (where, data) => {
      updates.push({ where, data });
    }
  };

  const mockEventTable = {
    insertEvent: async (fileId, type, detail, userId) => {
      events.push({ fileId, type, detail, userId });
    }
  };

  const mockAppUserTable = { resolveByEmail: async () => ({ user_id: 'u1', tenant_id: 't1' }) };

  const mockSm = {
    get: (name) => {
      if (name === 'AppUserTable') return mockAppUserTable;
      if (name === 'FileEventTable') return mockEventTable;
      return null;
    }
  };
  svc.getServiceManager = () => mockSm;
  svc.serviceManager = mockSm;
  svc.table['FileMetadataTable'] = mockTable;
  svc.table['AppUserTable'] = mockAppUserTable;
  svc.table['FileEventTable'] = mockEventTable;

  svc._invalidateFileCache = () => {};
  svc._now = () => new Date('2026-03-12T10:00:00Z');

  return { svc, updates, events, mockTable };
}

describe('FileMetadataService.deleteFile()', () => {
  it('sets deleted_at and deleted_by on the file record', async () => {
    const { svc, updates } = createService();

    await svc.deleteFile('file-1', 'user@example.com');

    expect(updates).toHaveLength(1);
    expect(updates[0].where).toEqual({ file_id: 'file-1' });
    expect(updates[0].data.deleted_at).toBeDefined();
    expect(updates[0].data.deleted_by).toBe('u1');
  });

  it('logs a DELETED event with delete_type soft', async () => {
    const { svc, events } = createService();

    await svc.deleteFile('file-1', 'user@example.com');

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('DELETED');
    expect(events[0].detail).toEqual({ delete_type: 'soft' });
    expect(events[0].fileId).toBe('file-1');
    expect(events[0].userId).toBe('u1');
  });

  it('throws when file does not exist', async () => {
    const { svc } = createService();

    await expect(svc.deleteFile('nonexistent', 'user@example.com'))
      .rejects.toThrow('File not found');
  });

  it('throws when file belongs to a different tenant', async () => {
    const { svc } = createService();

    await expect(svc.deleteFile('other-tenant-file', 'user@example.com'))
      .rejects.toThrow('Access denied');
  });

  it('does not throw if event logging fails', async () => {
    const { svc } = createService();
    svc.getServiceManager = () => ({
      get: (name) => {
        if (name === 'AppUserTable') return { resolveByEmail: async () => ({ user_id: 'u1', tenant_id: 't1' }) };
        if (name === 'FileEventTable') return { insertEvent: async () => { throw new Error('DB down'); } };
        return null;
      }
    });

    await expect(svc.deleteFile('file-1', 'user@example.com')).resolves.toBe(true);
  });

  it('returns true on success', async () => {
    const { svc } = createService();
    const result = await svc.deleteFile('file-1', 'user@example.com');
    expect(result).toBe(true);
  });
});
