const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const FileMetadataService = require(globalThis.applicationPath(
  '/application/service/domain/file-metadata-domain-service'
));

function createService(opts = {}) {
  const svc = new FileMetadataService();

  const sourceFile = opts.sourceFile || {
    getTenantId: () => 't1',
    getFolderId: () => 'src-folder',
    getObjectKey: () => 'tenants/t1/files/f1/report.pdf',
    getOriginalFilename: () => 'report.pdf',
    getTitle: () => 'report.pdf',
    getContentType: () => 'application/pdf',
    getSizeBytes: () => 2048,
    getStorageBackendId: () => 'sb1',
    getDocumentType: () => 'document'
  };

  const targetFolder = opts.targetFolder || {
    getTenantId: () => 't1',
    getFolderId: () => 'dest-folder'
  };

  const insertedRecords = [];
  const permissionsGranted = [];
  const eventsLogged = [];

  const mockTable = {
    fetchById: async (id) => {
      if (id === 'nonexistent') return null;
      return sourceFile;
    },
    insert: async (record) => {
      insertedRecords.push(record);
    }
  };

  const mockFolderTable = {
    fetchById: async (id) => {
      if (id === 'bad-folder') return null;
      if (id === 'other-tenant-folder') return { getTenantId: () => 'other-tenant' };
      return targetFolder;
    }
  };

  const mockPermTable = {
    upsertPermission: async (tenantId, fileId, userId, role, grantedBy) => {
      permissionsGranted.push({ tenantId, fileId, userId, role, grantedBy });
    }
  };

  const writtenFiles = [];
  const destBackend = { getProvider: () => 'local_fs', getConfig: () => ({ root_path: './storage' }), getStorageBackendId: () => 'sb1' };
  const mockStorageService = {
    resolveBackendForTenant: async () => ({
      backend: destBackend,
      keyTemplate: 'tenants/{tenant_id}/files/{file_id}/{sanitized_filename}'
    }),
    getBackend: async () => destBackend,
    interpolateKeyTemplate: (template, vars) => {
      let result = template;
      for (const [k, v] of Object.entries(vars)) {
        result = result.replace(`{${k}}`, v);
      }
      return result;
    },
    read: async () => ({ pipe: () => {} }),
    write: async (stream, backend, key, options) => {
      writtenFiles.push({ key, options });
      return { size: options.sizeBytes };
    },
    buildStorageUri: (key) => 'file:///storage/' + key
  };

  const mockQueryCache = {
    onFileChanged: async () => {}
  };

  svc.getTable = (name) => {
    if (name === 'FileMetadataTable') return mockTable;
    return null;
  };

  svc.getServiceManager = () => ({
    get: (name) => {
      if (name === 'AppUserTable') return {
        resolveByEmail: async () => ({ user_id: 'u1', tenant_id: 't1' })
      };
      if (name === 'FolderTable') return mockFolderTable;
      if (name === 'FilePermissionTable') return mockPermTable;
      if (name === 'StorageService') return mockStorageService;
      if (name === 'QueryCacheService') return mockQueryCache;
      if (name === 'FileEventTable') return {
        insertEvent: async () => {}
      };
      if (name === 'FileDerivativeTable') return opts.mockDerivativeTable || {
        fetchByFileId: async () => [],
        upsertDerivative: async () => null
      };
      if (name === 'TenantPolicyTable') return {
        fetchByTenantId: async () => ({
          getDerivativeKeyTemplate: () => 'tenants/{tenant_id}/derivatives/{file_id}/{kind}_{spec}.{ext}'
        })
      };
      if (name === 'DbAdapter') return { query: jest.fn().mockResolvedValue({}) };
      return null;
    }
  });

  return {
    svc,
    insertedRecords,
    permissionsGranted,
    eventsLogged,
    writtenFiles
  };
}

describe('FileMetadataService.copyFile()', () => {
  it('copies a file to the target folder', async () => {
    const { svc, insertedRecords, permissionsGranted, writtenFiles } = createService();
    const result = await svc.copyFile('f1', 'dest-folder', 'test@example.com');

    expect(result.file_id).toBeDefined();
    expect(result.file_id).not.toBe('f1');
    expect(insertedRecords).toHaveLength(1);
    expect(insertedRecords[0].folder_id).toBe('dest-folder');
    expect(insertedRecords[0].tenant_id).toBe('t1');
    expect(insertedRecords[0].title).toBe('report.pdf');
    expect(insertedRecords[0].content_type).toBe('application/pdf');
    expect(insertedRecords[0].size_bytes).toBe(2048);
    expect(insertedRecords[0].record_status).toBe('upload');
    expect(insertedRecords[0].record_sub_status).toBe('completed');
    expect(insertedRecords[0].visibility).toBe('private');
  });

  it('copies file content in storage', async () => {
    const { svc, writtenFiles } = createService();
    await svc.copyFile('f1', 'dest-folder', 'test@example.com');

    expect(writtenFiles).toHaveLength(1);
    expect(writtenFiles[0].options.sizeBytes).toBe(2048);
    expect(writtenFiles[0].options.contentType).toBe('application/pdf');
    expect(writtenFiles[0].key).toContain('tenants/t1/files/');
  });

  it('grants owner permission on the copy', async () => {
    const { svc, permissionsGranted } = createService();
    const result = await svc.copyFile('f1', 'dest-folder', 'test@example.com');

    expect(permissionsGranted).toHaveLength(1);
    expect(permissionsGranted[0].fileId).toBe(result.file_id);
    expect(permissionsGranted[0].userId).toBe('u1');
    expect(permissionsGranted[0].role).toBe('owner');
  });

  it('generates a new file_id different from source', async () => {
    const { svc } = createService();
    const result = await svc.copyFile('f1', 'dest-folder', 'test@example.com');

    expect(result.file_id).toBeDefined();
    expect(typeof result.file_id).toBe('string');
    expect(result.file_id.length).toBeGreaterThan(0);
    expect(result.file_id).not.toBe('f1');
  });

  it('generates a new storage URI for the copy', async () => {
    const { svc, insertedRecords } = createService();
    await svc.copyFile('f1', 'dest-folder', 'test@example.com');

    expect(insertedRecords[0].storage_uri).toContain('file:///storage/');
    expect(insertedRecords[0].object_key).toContain('tenants/t1/files/');
    expect(insertedRecords[0].object_key).not.toBe('tenants/t1/files/f1/report.pdf');
  });

  it('throws when source file not found', async () => {
    const { svc } = createService();
    await expect(svc.copyFile('nonexistent', 'dest-folder', 'test@example.com'))
      .rejects.toThrow('File not found');
  });

  it('throws when target folder not found', async () => {
    const { svc } = createService();
    await expect(svc.copyFile('f1', 'bad-folder', 'test@example.com'))
      .rejects.toThrow('Destination folder not found');
  });

  it('throws when target folder belongs to different tenant', async () => {
    const { svc } = createService();
    await expect(svc.copyFile('f1', 'other-tenant-folder', 'test@example.com'))
      .rejects.toThrow('Access denied to destination folder');
  });

  it('sets created_by and updated_by to the copying user', async () => {
    const { svc, insertedRecords } = createService();
    await svc.copyFile('f1', 'dest-folder', 'test@example.com');

    expect(insertedRecords[0].created_by).toBe('u1');
    expect(insertedRecords[0].updated_by).toBe('u1');
  });

  it('sets timestamps on the copy', async () => {
    const { svc, insertedRecords } = createService();
    await svc.copyFile('f1', 'dest-folder', 'test@example.com');

    expect(insertedRecords[0].created_dt).toBeInstanceOf(Date);
    expect(insertedRecords[0].updated_dt).toBeInstanceOf(Date);
  });

  it('copies ready derivatives with pending-then-ready pattern', async () => {
    const upsertedDerivatives = [];
    const mockDerivativeTable = {
      fetchByFileId: async () => [
        {
          getKind: () => 'thumbnail',
          getSpec: () => ({ format: 'webp', size: 256 }),
          getStatus: () => 'ready',
          getStorageBackendId: () => 'sb1',
          getObjectKey: () => 'tenants/t1/derivatives/f1/thumbnail_webp256.webp',
          getSizeBytes: () => 1024,
          getManifest: () => null
        },
        {
          getKind: () => 'thumbnail',
          getSpec: () => ({ format: 'webp', size: 64 }),
          getStatus: () => 'failed',
          getStorageBackendId: () => 'sb1',
          getObjectKey: () => 'tenants/t1/derivatives/f1/thumbnail_webp64.webp',
          getSizeBytes: () => 0,
          getManifest: () => null
        }
      ],
      upsertDerivative: async (data) => {
        upsertedDerivatives.push(data);
        return { getDerivativeId: () => 'new-deriv-1' };
      }
    };

    const { svc } = createService({ mockDerivativeTable });
    await svc.copyFile('f1', 'dest-folder', 'test@example.com');

    // Only the 'ready' source derivative should be processed (not the 'failed' one)
    // Two upserts: first pending, then ready after storage copy succeeds
    expect(upsertedDerivatives).toHaveLength(2);
    expect(upsertedDerivatives[0].status).toBe('pending');
    expect(upsertedDerivatives[0].kind).toBe('thumbnail');
    expect(upsertedDerivatives[1].status).toBe('ready');
    expect(upsertedDerivatives[1].kind).toBe('thumbnail');
    expect(upsertedDerivatives[1].objectKey).toContain('thumbnail_webp256.webp');
    // The new derivative should reference the NEW file id, not the source
    expect(upsertedDerivatives[0].fileId).not.toBe('f1');
    expect(upsertedDerivatives[1].fileId).not.toBe('f1');
  });

  it('marks derivative as failed when storage copy fails', async () => {
    const upsertedDerivatives = [];
    let readCallCount = 0;
    const mockDerivativeTable = {
      fetchByFileId: async () => [
        {
          getKind: () => 'thumbnail',
          getSpec: () => ({ format: 'webp', size: 256 }),
          getStatus: () => 'ready',
          getStorageBackendId: () => 'sb1',
          getObjectKey: () => 'tenants/t1/derivatives/f1/thumbnail_webp256.webp',
          getSizeBytes: () => 1024,
          getManifest: () => null
        }
      ],
      upsertDerivative: async (data) => {
        upsertedDerivatives.push(data);
        return { getDerivativeId: () => 'new-deriv-1' };
      }
    };

    // Override storage read to fail on derivative read (2nd call)
    const { svc } = createService({ mockDerivativeTable });
    const origSm = svc.getServiceManager();
    const origGet = origSm.get.bind(origSm);
    svc.getServiceManager = () => ({
      get: (name) => {
        if (name === 'StorageService') {
          const origStorage = origGet('StorageService');
          return {
            ...origStorage,
            read: async () => {
              readCallCount++;
              // First read is for the main file, subsequent are for derivatives
              if (readCallCount > 1) throw new Error('S3 key not found');
              return { pipe: () => {} };
            }
          };
        }
        return origGet(name);
      }
    });

    await svc.copyFile('f1', 'dest-folder', 'test@example.com');

    // Should have: pending upsert, then failed upsert
    expect(upsertedDerivatives).toHaveLength(2);
    expect(upsertedDerivatives[0].status).toBe('pending');
    expect(upsertedDerivatives[1].status).toBe('failed');
    expect(upsertedDerivatives[1].errorDetail).toBe('S3 key not found');
  });

  it('throws domain error and does not create record when source storage object is missing', async () => {
    const { svc, insertedRecords } = createService();

    // Override StorageService.read to throw (simulating missing S3 object)
    const origGet = svc.getServiceManager().get;
    svc.getServiceManager = () => ({
      get: (name) => {
        if (name === 'StorageService') {
          const base = origGet(name);
          return {
            ...base,
            read: async () => { throw new Error('The specified key does not exist.'); }
          };
        }
        return origGet(name);
      }
    });

    const spy = jest.spyOn(console, 'error').mockImplementation();
    await expect(svc.copyFile('f1', 'dest-folder', 'test@example.com'))
      .rejects.toThrow('File content is missing from storage and could not be copied.');
    spy.mockRestore();

    // No destination record should have been created
    expect(insertedRecords).toHaveLength(0);
  });
});
