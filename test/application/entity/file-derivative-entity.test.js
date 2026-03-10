const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FileDerivativeEntity;
beforeAll(() => {
  FileDerivativeEntity = require(globalThis.applicationPath('/application/entity/file-derivative-entity'));
});

describe('FileDerivativeEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new FileDerivativeEntity();
      expect(entity.getDerivativeId()).toBeNull();
      expect(entity.getFileId()).toBeNull();
      expect(entity.getKind()).toBeNull();
      expect(entity.getSpec()).toEqual({});
      expect(entity.getStorageBackendId()).toBeNull();
      expect(entity.getObjectKey()).toBeNull();
      expect(entity.getStorageUri()).toBeNull();
      expect(entity.getSizeBytes()).toBeNull();
      expect(entity.getManifest()).toBeNull();
      expect(entity.getCreatedDt()).toBeNull();
      expect(entity.getStatus()).toBe('pending');
      expect(entity.getErrorDetail()).toBeNull();
      expect(entity.getAttempts()).toBe(0);
      expect(entity.getLastAttemptDt()).toBeNull();
      expect(entity.getReadyDt()).toBeNull();
      expect(entity.getProcessingStartedDt()).toBeNull();
      expect(entity.getUpdatedDt()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        derivative_id: 'd-1',
        file_id: 'f-1',
        kind: 'thumbnail',
        spec: { width: 200, height: 200 },
        storage_backend_id: 'sb-1',
        object_key: 'tenant/derivatives/thumb.jpg',
        storage_uri: 's3://bucket/thumb.jpg',
        size_bytes: 12345,
        manifest: 'manifest-data',
        created_dt: '2025-01-01T00:00:00Z',
        status: 'ready',
        error_detail: null,
        attempts: 1,
        last_attempt_dt: '2025-01-01T00:01:00Z',
        ready_dt: '2025-01-01T00:02:00Z',
        processing_started_dt: '2025-01-01T00:00:30Z',
        updated_dt: '2025-01-01T00:02:00Z'
      };
      const entity = new FileDerivativeEntity(data);
      expect(entity.getDerivativeId()).toBe('d-1');
      expect(entity.getFileId()).toBe('f-1');
      expect(entity.getKind()).toBe('thumbnail');
      expect(entity.getSpec()).toEqual({ width: 200, height: 200 });
      expect(entity.getStorageBackendId()).toBe('sb-1');
      expect(entity.getObjectKey()).toBe('tenant/derivatives/thumb.jpg');
      expect(entity.getStorageUri()).toBe('s3://bucket/thumb.jpg');
      expect(entity.getSizeBytes()).toBe(12345);
      expect(entity.getManifest()).toBe('manifest-data');
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
      expect(entity.getStatus()).toBe('ready');
      expect(entity.getErrorDetail()).toBeNull();
      expect(entity.getAttempts()).toBe(1);
      expect(entity.getLastAttemptDt()).toBe('2025-01-01T00:01:00Z');
      expect(entity.getReadyDt()).toBe('2025-01-01T00:02:00Z');
      expect(entity.getProcessingStartedDt()).toBe('2025-01-01T00:00:30Z');
      expect(entity.getUpdatedDt()).toBe('2025-01-01T00:02:00Z');
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new FileDerivativeEntity();
    });

    it('should get/set derivative_id', () => {
      entity.setDerivativeId('d-100');
      expect(entity.getDerivativeId()).toBe('d-100');
    });

    it('should get/set file_id', () => {
      entity.setFileId('f-200');
      expect(entity.getFileId()).toBe('f-200');
    });

    it('should get/set kind', () => {
      entity.setKind('preview');
      expect(entity.getKind()).toBe('preview');
    });

    it('should get/set spec', () => {
      entity.setSpec({ format: 'webp' });
      expect(entity.getSpec()).toEqual({ format: 'webp' });
    });

    it('should get/set storage_backend_id', () => {
      entity.setStorageBackendId('sb-300');
      expect(entity.getStorageBackendId()).toBe('sb-300');
    });

    it('should get/set object_key', () => {
      entity.setObjectKey('path/to/file');
      expect(entity.getObjectKey()).toBe('path/to/file');
    });

    it('should get/set storage_uri', () => {
      entity.setStorageUri('s3://bucket/key');
      expect(entity.getStorageUri()).toBe('s3://bucket/key');
    });

    it('should get/set size_bytes', () => {
      entity.setSizeBytes(99999);
      expect(entity.getSizeBytes()).toBe(99999);
    });

    it('should get/set manifest', () => {
      entity.setManifest('manifest');
      expect(entity.getManifest()).toBe('manifest');
    });

    it('should get/set created_dt', () => {
      entity.setCreatedDt('2025-03-01T00:00:00Z');
      expect(entity.getCreatedDt()).toBe('2025-03-01T00:00:00Z');
    });

    it('should get/set status', () => {
      entity.setStatus('processing');
      expect(entity.getStatus()).toBe('processing');
    });

    it('should get/set error_detail', () => {
      entity.setErrorDetail('timeout');
      expect(entity.getErrorDetail()).toBe('timeout');
    });

    it('should get/set attempts', () => {
      entity.setAttempts(3);
      expect(entity.getAttempts()).toBe(3);
    });

    it('should get/set last_attempt_dt', () => {
      entity.setLastAttemptDt('2025-04-01T00:00:00Z');
      expect(entity.getLastAttemptDt()).toBe('2025-04-01T00:00:00Z');
    });

    it('should get/set ready_dt', () => {
      entity.setReadyDt('2025-05-01T00:00:00Z');
      expect(entity.getReadyDt()).toBe('2025-05-01T00:00:00Z');
    });

    it('should get/set processing_started_dt', () => {
      entity.setProcessingStartedDt('2025-06-01T00:00:00Z');
      expect(entity.getProcessingStartedDt()).toBe('2025-06-01T00:00:00Z');
    });

    it('should get/set updated_dt', () => {
      entity.setUpdatedDt('2025-07-01T00:00:00Z');
      expect(entity.getUpdatedDt()).toBe('2025-07-01T00:00:00Z');
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(FileDerivativeEntity.schema);
      expect(keys).toEqual([
        'derivative_id', 'file_id', 'kind', 'spec', 'storage_backend_id',
        'object_key', 'storage_uri', 'size_bytes', 'manifest', 'created_dt',
        'status', 'error_detail', 'attempts', 'last_attempt_dt', 'ready_dt',
        'processing_started_dt', 'updated_dt'
      ]);
    });

    it('should have correct default values', () => {
      expect(FileDerivativeEntity.schema.derivative_id).toBeNull();
      expect(FileDerivativeEntity.schema.file_id).toBeNull();
      expect(FileDerivativeEntity.schema.kind).toBeNull();
      expect(FileDerivativeEntity.schema.spec).toEqual({});
      expect(FileDerivativeEntity.schema.storage_backend_id).toBeNull();
      expect(FileDerivativeEntity.schema.object_key).toBeNull();
      expect(FileDerivativeEntity.schema.storage_uri).toBeNull();
      expect(FileDerivativeEntity.schema.size_bytes).toBeNull();
      expect(FileDerivativeEntity.schema.manifest).toBeNull();
      expect(FileDerivativeEntity.schema.created_dt).toBeNull();
      expect(FileDerivativeEntity.schema.status).toBe('pending');
      expect(FileDerivativeEntity.schema.error_detail).toBeNull();
      expect(FileDerivativeEntity.schema.attempts).toBe(0);
      expect(FileDerivativeEntity.schema.last_attempt_dt).toBeNull();
      expect(FileDerivativeEntity.schema.ready_dt).toBeNull();
      expect(FileDerivativeEntity.schema.processing_started_dt).toBeNull();
      expect(FileDerivativeEntity.schema.updated_dt).toBeNull();
    });
  });

  describe('validation', () => {
    it('should be valid when file_id, kind, and storage_backend_id are provided', () => {
      const entity = new FileDerivativeEntity({
        file_id: 'f-1',
        kind: 'thumbnail',
        storage_backend_id: 'sb-1'
      });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when file_id is missing', () => {
      const entity = new FileDerivativeEntity({
        kind: 'thumbnail',
        storage_backend_id: 'sb-1'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when kind is missing', () => {
      const entity = new FileDerivativeEntity({
        file_id: 'f-1',
        storage_backend_id: 'sb-1'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when storage_backend_id is missing', () => {
      const entity = new FileDerivativeEntity({
        file_id: 'f-1',
        kind: 'thumbnail'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when all required fields are missing', () => {
      const entity = new FileDerivativeEntity();
      expect(entity.isValid()).toBe(false);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new FileDerivativeEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
