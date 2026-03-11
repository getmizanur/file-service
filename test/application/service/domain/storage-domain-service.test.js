const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

// Mock stream.pipeline so that promisify(pipeline) picks up the mock
const mockPipeline = jest.fn();
jest.mock('node:stream', () => {
  const actual = jest.requireActual('node:stream');
  return { ...actual, pipeline: mockPipeline };
});

// Mock @aws-sdk/lib-storage Upload for multipart tests
const mockUploadDone = jest.fn().mockResolvedValue({});
jest.mock('@aws-sdk/lib-storage', () => {
  const actual = jest.requireActual('@aws-sdk/lib-storage');
  return {
    ...actual,
    Upload: jest.fn().mockImplementation(() => ({ done: mockUploadDone })),
  };
});

const StorageService = require(path.join(projectRoot, 'application/service/domain/storage-domain-service'));
const AbstractDomainService = require(path.join(projectRoot, 'application/service/abstract-domain-service'));
const TableGateway = require(path.join(projectRoot, 'library/db/table-gateway'));

describe('StorageService', () => {
  let service;
  let mockStorageBackendTable;
  let mockTenantPolicyTable;
  let mockSm;

  beforeEach(() => {
    service = new StorageService();

    mockStorageBackendTable = Object.create(TableGateway.prototype);
    mockStorageBackendTable.fetchById = jest.fn().mockResolvedValue(null);
    mockStorageBackendTable.fetchAll = jest.fn().mockResolvedValue([]);

    mockTenantPolicyTable = Object.create(TableGateway.prototype);
    mockTenantPolicyTable.fetchByTenantId = jest.fn().mockResolvedValue(null);

    mockSm = {
      get: jest.fn((name) => {
        if (name === 'StorageBackendTable') return mockStorageBackendTable;
        if (name === 'TenantPolicyTable') return mockTenantPolicyTable;
        return null;
      }),
    };
    service.setServiceManager(mockSm);
    service.table = {};
  });

  describe('constructor', () => {
    it('should be an instance of AbstractDomainService', () => {
      expect(service).toBeInstanceOf(AbstractDomainService);
    });
    it('should initialize _s3Client as null', () => {
      expect(service._s3Client).toBeNull();
    });
  });

  describe('interpolateKeyTemplate', () => {
    it('should replace placeholders', () => {
      expect(service.interpolateKeyTemplate('tenants/{tenant_id}/files/{file_id}', { tenant_id: 't1', file_id: 'f1' }))
        .toBe('tenants/t1/files/f1');
    });
    it('should use defaults', () => {
      expect(service.interpolateKeyTemplate('{tenant_id}/{file_id}')).toBe('unknown/unknown');
    });
    it('should preserve unrecognized placeholders', () => {
      expect(service.interpolateKeyTemplate('{custom}')).toBe('{custom}');
    });
    it('should handle all defaults', () => {
      const result = service.interpolateKeyTemplate('{tenant_id}/{folder_id}/{file_id}/{sanitized_filename}/{integration}/{applicationRefId}/{documentType}');
      expect(result).toBe('unknown/root/unknown/file/admin/none/general');
    });
  });

  describe('_cleanPrefix', () => {
    it('should strip leading slashes', () => {
      expect(service._cleanPrefix('/uploads/')).toBe('uploads/');
    });
    it('should strip trailing /* or *', () => {
      expect(service._cleanPrefix('uploads/*')).toBe('uploads/');
    });
    it('should return empty for null/undefined/empty', () => {
      expect(service._cleanPrefix(null)).toBe('');
      expect(service._cleanPrefix(undefined)).toBe('');
      expect(service._cleanPrefix('')).toBe('');
    });
  });

  describe('_getBackendConfig', () => {
    it('should use getConfig method', () => {
      expect(service._getBackendConfig({ getConfig: () => ({ bucket: 'b' }) })).toEqual({ bucket: 'b' });
    });
    it('should parse JSON string', () => {
      expect(service._getBackendConfig({ config: '{"bucket":"b"}' })).toEqual({ bucket: 'b' });
    });
    it('should return empty for invalid JSON', () => {
      expect(service._getBackendConfig({ config: 'bad' })).toEqual({});
    });
    it('should return empty for null config', () => {
      expect(service._getBackendConfig({ config: null })).toEqual({});
    });
  });

  describe('getMaxUploadBytes', () => {
    it('should return default when no backend', () => {
      expect(service.getMaxUploadBytes(null)).toBe(524288000);
    });
    it('should return configured value', () => {
      expect(service.getMaxUploadBytes({ getConfig: () => ({ limits: { maxUploadBytes: 100 } }) })).toBe(100);
    });
    it('should return default when no limits', () => {
      expect(service.getMaxUploadBytes({ getConfig: () => ({}) })).toBe(524288000);
    });
  });

  describe('buildStorageUri', () => {
    it('should return null when no backend', () => {
      expect(service.buildStorageUri('key', null)).toBeNull();
    });

    it('should build local_fs URI', () => {
      const backend = { getProvider: () => 'local_fs', getConfig: () => ({ root_path: './storage' }) };
      const uri = service.buildStorageUri('test.pdf', backend);
      expect(uri).toMatch(/^file:\/\//);
      expect(uri).toContain('test.pdf');
    });

    it('should build local_fs URI with string config', () => {
      const backend = { config: '{"root_path": "./storage"}', provider: 'local_fs' };
      const uri = service.buildStorageUri('test.pdf', backend);
      expect(uri).toMatch(/^file:\/\//);
    });

    it('should handle invalid JSON in local_fs config', () => {
      const backend = { config: 'invalid', provider: 'local_fs' };
      const uri = service.buildStorageUri('test.pdf', backend);
      expect(uri).toMatch(/^file:\/\//);
    });

    it('should build aws_s3 URI', () => {
      const backend = { getProvider: () => 'aws_s3', getConfig: () => ({ bucket: 'my-bucket', prefix: '/uploads/*', region: 'us-east-1' }) };
      expect(service.buildStorageUri('file.pdf', backend)).toBe('s3://my-bucket/uploads/file.pdf');
    });

    it('should return null for aws_s3 without bucket', () => {
      const backend = { getProvider: () => 'aws_s3', getConfig: () => ({}) };
      expect(service.buildStorageUri('key', backend)).toBeNull();
    });

    it('should build aws_s3 URI without prefix', () => {
      const backend = { getProvider: () => 'aws_s3', getConfig: () => ({ bucket: 'b', region: 'us-east-1' }) };
      expect(service.buildStorageUri('file.pdf', backend)).toBe('s3://b/file.pdf');
    });
  });

  describe('resolveBackendForTenant', () => {
    it('should throw if no policy found', async () => {
      await expect(service.resolveBackendForTenant('t1')).rejects.toThrow('No tenant policy found');
    });

    it('should throw if no storage_backend_id', async () => {
      mockTenantPolicyTable.fetchByTenantId.mockResolvedValue({
        getStorageBackendId: () => null,
        getKeyTemplate: () => 'template',
      });
      await expect(service.resolveBackendForTenant('t1')).rejects.toThrow('has no storage_backend_id');
    });

    it('should resolve backend and keyTemplate', async () => {
      mockTenantPolicyTable.fetchByTenantId.mockResolvedValue({
        getStorageBackendId: () => 'sb1',
        getKeyTemplate: () => 'template/{file_id}',
      });
      const mockBackend = { getIsEnabled: () => true };
      mockStorageBackendTable.fetchById.mockResolvedValue(mockBackend);

      const result = await service.resolveBackendForTenant('t1');
      expect(result.backend).toBe(mockBackend);
      expect(result.keyTemplate).toBe('template/{file_id}');
    });
  });

  describe('getBackend', () => {
    it('should throw if backend not found', async () => {
      await expect(service.getBackend('bad')).rejects.toThrow('Storage backend not found');
    });

    it('should throw if backend is disabled', async () => {
      mockStorageBackendTable.fetchById.mockResolvedValue({ getIsEnabled: () => false });
      await expect(service.getBackend('sb1')).rejects.toThrow('Storage backend is disabled');
    });

    it('should return enabled backend', async () => {
      const backend = { getIsEnabled: () => true };
      mockStorageBackendTable.fetchById.mockResolvedValue(backend);
      const result = await service.getBackend('sb1');
      expect(result).toBe(backend);
    });
  });

  describe('findBackendByProvider', () => {
    it('should find enabled backend by provider', async () => {
      const backends = [
        { provider: 'aws_s3', is_enabled: true },
        { provider: 'local_fs', is_enabled: false },
      ];
      mockStorageBackendTable.fetchAll.mockResolvedValue(backends);
      const result = await service.findBackendByProvider('aws_s3');
      expect(result).toBe(backends[0]);
    });

    it('should return undefined if not found', async () => {
      mockStorageBackendTable.fetchAll.mockResolvedValue([]);
      const result = await service.findBackendByProvider('aws_s3');
      expect(result).toBeUndefined();
    });

    it('should match is_enabled as 1', async () => {
      const backends = [{ provider: 'local_fs', is_enabled: 1 }];
      mockStorageBackendTable.fetchAll.mockResolvedValue(backends);
      const result = await service.findBackendByProvider('local_fs');
      expect(result).toBe(backends[0]);
    });
  });

  describe('write', () => {
    it('should throw for unsupported provider', async () => {
      await expect(service.write(null, { getProvider: () => 'azure' }, 'key')).rejects.toThrow('Unsupported');
    });

    it('should call writeLocal for local_fs', async () => {
      const spy = jest.spyOn(service, 'writeLocal').mockResolvedValue({ size: 100 });
      await service.write('stream', { getProvider: () => 'local_fs' }, 'key');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should call writeS3 for aws_s3', async () => {
      const spy = jest.spyOn(service, 'writeS3').mockResolvedValue({ size: 100 });
      await service.write('stream', { getProvider: () => 'aws_s3' }, 'key');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should use provider property fallback', async () => {
      const spy = jest.spyOn(service, 'writeLocal').mockResolvedValue({ size: 100 });
      await service.write('stream', { provider: 'local_fs' }, 'key');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('read', () => {
    it('should throw for unsupported provider', async () => {
      await expect(service.read({ getProvider: () => 'azure' }, 'key')).rejects.toThrow('Unsupported');
    });

    it('should call readLocal for local_fs', async () => {
      const spy = jest.spyOn(service, 'readLocal').mockResolvedValue('stream');
      await service.read({ getProvider: () => 'local_fs' }, 'key');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should call readS3 for aws_s3', async () => {
      const spy = jest.spyOn(service, 'readS3').mockResolvedValue('stream');
      await service.read({ getProvider: () => 'aws_s3' }, 'key');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should use provider property fallback', async () => {
      const spy = jest.spyOn(service, 'readLocal').mockResolvedValue('stream');
      await service.read({ provider: 'local_fs' }, 'key');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('_getS3Client', () => {
    it('should create and cache S3 client', () => {
      const client = service._getS3Client('us-east-1');
      expect(client).toBeDefined();
      expect(service._s3Client).toBe(client);
      // Second call should return same instance
      expect(service._getS3Client('us-east-1')).toBe(client);
    });
  });

  describe('writeLocal', () => {
    it('should throw for invalid JSON config', async () => {
      const backend = { config: 'bad json' };
      const spy = jest.spyOn(console, 'error').mockImplementation();
      await expect(service.writeLocal('stream', backend, 'key')).rejects.toThrow('Invalid backend configuration');
      spy.mockRestore();
    });
  });

  describe('readLocal', () => {
    it('should throw for invalid JSON config', async () => {
      const backend = { config: 'bad json' };
      const spy = jest.spyOn(console, 'error').mockImplementation();
      await expect(service.readLocal(backend, 'key')).rejects.toThrow('Invalid backend configuration');
      spy.mockRestore();
    });

    it('should throw if file not found', async () => {
      const backend = { getConfig: () => ({ root_path: '/nonexistent/path' }) };
      await expect(service.readLocal(backend, 'missing-file.txt')).rejects.toThrow('File not found in storage');
    });
  });

  describe('writeS3', () => {
    it('should use single upload for small files', async () => {
      const spy = jest.spyOn(service, '_writeS3Single').mockResolvedValue({ size: 100 });
      const backend = { getConfig: () => ({ bucket: 'b', region: 'us-east-1' }) };
      await service.writeS3('stream', backend, 'key', { sizeBytes: 100 });
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should use multipart upload for large files', async () => {
      const spy = jest.spyOn(service, '_writeS3Multipart').mockResolvedValue({ size: 100000000 });
      const backend = { getConfig: () => ({ bucket: 'b', region: 'us-east-1' }) };
      await service.writeS3('stream', backend, 'key', { sizeBytes: 100000000 });
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should respect custom multipart threshold', async () => {
      const spy = jest.spyOn(service, '_writeS3Multipart').mockResolvedValue({ size: 100 });
      const backend = { getConfig: () => ({ bucket: 'b', region: 'us-east-1', upload: { useMultipartAboveBytes: 50 } }) };
      await service.writeS3('stream', backend, 'key', { sizeBytes: 100 });
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should apply prefix to key', async () => {
      const spy = jest.spyOn(service, '_writeS3Single').mockResolvedValue({ size: 100 });
      const backend = { getConfig: () => ({ bucket: 'b', region: 'us-east-1', prefix: '/uploads/*' }) };
      await service.writeS3('stream', backend, 'test.pdf', { sizeBytes: 0 });
      expect(spy).toHaveBeenCalledWith(expect.anything(), 'b', 'uploads/test.pdf', 'stream', 'application/octet-stream');
      spy.mockRestore();
    });

    it('should use custom contentType', async () => {
      const spy = jest.spyOn(service, '_writeS3Single').mockResolvedValue({ size: 100 });
      const backend = { getConfig: () => ({ bucket: 'b', region: 'us-east-1' }) };
      await service.writeS3('stream', backend, 'key', { sizeBytes: 0, contentType: 'image/png' });
      expect(spy).toHaveBeenCalledWith(expect.anything(), 'b', 'key', 'stream', 'image/png');
      spy.mockRestore();
    });
  });

  describe('writeLocal - full flow', () => {
    let mkdirSpy, statSpy, createWriteStreamSpy;

    beforeEach(() => {
      const fs = require('node:fs');
      mkdirSpy = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
      statSpy = jest.spyOn(fs.promises, 'stat');
      createWriteStreamSpy = jest.spyOn(fs, 'createWriteStream').mockReturnValue({});
      mockPipeline.mockReset();
      // pipeline is called with (stream, writeStream, callback)
      mockPipeline.mockImplementation((...args) => {
        const cb = args[args.length - 1];
        if (typeof cb === 'function') cb(null);
      });
    });

    afterEach(() => {
      mkdirSpy.mockRestore();
      statSpy.mockRestore();
      createWriteStreamSpy.mockRestore();
    });

    it('should write stream to local filesystem', async () => {
      statSpy.mockResolvedValue({ size: 1024 });
      const backend = { getConfig: () => ({ root_path: './storage' }) };

      const result = await service.writeLocal('stream-data', backend, 'test.txt');
      expect(result.size).toBe(1024);
      expect(mkdirSpy).toHaveBeenCalled();
      expect(createWriteStreamSpy).toHaveBeenCalled();
      expect(mockPipeline).toHaveBeenCalled();
    });

    it('should use getConfig method when available', async () => {
      statSpy.mockResolvedValue({ size: 500 });
      const backend = { getConfig: () => ({ root_path: '/tmp/storage' }) };
      const result = await service.writeLocal('stream', backend, 'file.pdf');
      expect(result.size).toBe(500);
    });

    it('should parse JSON string config', async () => {
      statSpy.mockResolvedValue({ size: 200 });
      const backend = { config: '{"root_path":"./storage"}' };
      const result = await service.writeLocal('stream', backend, 'file.pdf');
      expect(result.size).toBe(200);
    });

    it('should use default root_path when not specified', async () => {
      statSpy.mockResolvedValue({ size: 100 });
      const backend = { getConfig: () => ({}) };
      const result = await service.writeLocal('stream', backend, 'file.txt');
      expect(result.size).toBe(100);
      const writePath = createWriteStreamSpy.mock.calls[0][0];
      expect(writePath).toContain('storage');
    });
  });

  describe('_writeS3Single', () => {
    it('should buffer stream and send PutObjectCommand', async () => {
      const { Readable } = require('node:stream');
      const mockClient = { send: jest.fn().mockResolvedValue({}) };
      const stream = Readable.from([Buffer.from('chunk1'), Buffer.from('chunk2')]);

      const result = await service._writeS3Single(mockClient, 'my-bucket', 'my-key', stream, 'text/plain');
      expect(result.size).toBe(12); // 'chunk1' + 'chunk2'
      expect(mockClient.send).toHaveBeenCalled();
    });
  });

  describe('_writeS3Multipart', () => {
    it('should use Upload for multipart upload', async () => {
      const mockClient = { send: jest.fn() };
      mockUploadDone.mockResolvedValue({});

      const result = await service._writeS3Multipart(mockClient, 'my-bucket', 'my-key', 'stream', 'text/plain', 50000000);
      expect(result.size).toBe(50000000);
      expect(mockUploadDone).toHaveBeenCalled();

      const { Upload } = require('@aws-sdk/lib-storage');
      expect(Upload).toHaveBeenCalledWith(expect.objectContaining({
        client: mockClient,
        params: expect.objectContaining({
          Bucket: 'my-bucket',
          Key: 'my-key',
          ContentType: 'text/plain',
        }),
      }));
    });
  });

  describe('readLocal - full flow', () => {
    it('should return read stream for existing file', async () => {
      const fs = require('node:fs');
      const mockStream = { pipe: jest.fn() };

      const accessSpy = jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined);
      const createReadStreamSpy = jest.spyOn(fs, 'createReadStream').mockReturnValue(mockStream);

      const backend = { getConfig: () => ({ root_path: '/tmp/storage' }) };
      const result = await service.readLocal(backend, 'test-file.txt');
      expect(result).toBe(mockStream);

      accessSpy.mockRestore();
      createReadStreamSpy.mockRestore();
    });

    it('should decode URI-encoded objectKey', async () => {
      const fs = require('node:fs');
      const mockStream = { pipe: jest.fn() };

      const accessSpy = jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined);
      const createReadStreamSpy = jest.spyOn(fs, 'createReadStream').mockReturnValue(mockStream);

      const backend = { getConfig: () => ({ root_path: '/tmp/storage' }) };
      await service.readLocal(backend, 'path%20with%20spaces/file.txt');
      const readPath = createReadStreamSpy.mock.calls[0][0];
      expect(readPath).toContain('path with spaces');

      accessSpy.mockRestore();
      createReadStreamSpy.mockRestore();
    });

    it('should use default root_path when not in config', async () => {
      const fs = require('node:fs');

      const accessSpy = jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined);
      const createReadStreamSpy = jest.spyOn(fs, 'createReadStream').mockReturnValue('stream');

      const backend = { getConfig: () => ({}) };
      await service.readLocal(backend, 'file.txt');
      const readPath = createReadStreamSpy.mock.calls[0][0];
      expect(readPath).toContain('storage');

      accessSpy.mockRestore();
      createReadStreamSpy.mockRestore();
    });

    it('should parse string config', async () => {
      const fs = require('node:fs');

      const accessSpy = jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined);
      const createReadStreamSpy = jest.spyOn(fs, 'createReadStream').mockReturnValue('stream');

      const backend = { config: '{"root_path":"/data"}' };
      await service.readLocal(backend, 'file.txt');

      accessSpy.mockRestore();
      createReadStreamSpy.mockRestore();
    });
  });

  describe('readS3', () => {
    it('should send GetObjectCommand and return response body', async () => {
      const mockBody = { on: jest.fn() };
      const mockClient = { send: jest.fn().mockResolvedValue({ Body: mockBody }) };
      service._s3Client = mockClient;

      const backend = { getConfig: () => ({ bucket: 'my-bucket', region: 'us-east-1', prefix: '/docs/*' }) };
      const result = await service.readS3(backend, 'file.pdf');
      expect(result).toBe(mockBody);
      expect(mockClient.send).toHaveBeenCalled();
    });

    it('should decode URI-encoded keys', async () => {
      const mockClient = { send: jest.fn().mockResolvedValue({ Body: 'body' }) };
      service._s3Client = mockClient;

      const backend = { getConfig: () => ({ bucket: 'b', region: 'us-east-1' }) };
      await service.readS3(backend, 'path%20with%20spaces.pdf');
      // The s3Key should have decoded spaces
      const sendArg = mockClient.send.mock.calls[0][0];
      expect(sendArg.input.Key).toContain('path with spaces');
    });

    it('should work without prefix', async () => {
      const mockClient = { send: jest.fn().mockResolvedValue({ Body: 'body' }) };
      service._s3Client = mockClient;

      const backend = { getConfig: () => ({ bucket: 'b', region: 'us-east-1' }) };
      await service.readS3(backend, 'file.pdf');
      const sendArg = mockClient.send.mock.calls[0][0];
      expect(sendArg.input.Key).toBe('file.pdf');
    });
  });
});
