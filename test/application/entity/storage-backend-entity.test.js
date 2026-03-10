const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let StorageBackendEntity;
beforeAll(() => {
  StorageBackendEntity = require(globalThis.applicationPath('/application/entity/storage-backend-entity'));
});

describe('StorageBackendEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new StorageBackendEntity();
      expect(entity.getStorageBackendId()).toBeNull();
      expect(entity.getName()).toBeNull();
      expect(entity.getProvider()).toBeNull();
      expect(entity.getDelivery()).toBeNull();
      expect(entity.getIsEnabled()).toBe(true);
      expect(entity.getConfig()).toEqual({});
      expect(entity.getCreatedDt()).toBeNull();
      expect(entity.getUpdatedDt()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        storage_backend_id: 'sb-1',
        name: 'Primary S3',
        provider: 'aws_s3',
        delivery: 'cloudfront_signed_url',
        is_enabled: true,
        config: { bucket: 'my-bucket' },
        created_dt: '2025-01-01T00:00:00Z',
        updated_dt: '2025-06-01T00:00:00Z'
      };
      const entity = new StorageBackendEntity(data);
      expect(entity.getStorageBackendId()).toBe('sb-1');
      expect(entity.getName()).toBe('Primary S3');
      expect(entity.getProvider()).toBe('aws_s3');
      expect(entity.getDelivery()).toBe('cloudfront_signed_url');
      expect(entity.getIsEnabled()).toBe(true);
      expect(entity.getConfig()).toEqual({ bucket: 'my-bucket' });
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
      expect(entity.getUpdatedDt()).toBe('2025-06-01T00:00:00Z');
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new StorageBackendEntity();
    });

    it('should get/set storage_backend_id', () => {
      entity.setStorageBackendId('sb-100');
      expect(entity.getStorageBackendId()).toBe('sb-100');
    });

    it('should get/set name', () => {
      entity.setName('Azure Blob');
      expect(entity.getName()).toBe('Azure Blob');
    });

    it('should get/set provider with valid value', () => {
      entity.setProvider('aws_s3');
      expect(entity.getProvider()).toBe('aws_s3');
    });

    it('should get/set delivery with valid value', () => {
      entity.setDelivery('app_stream');
      expect(entity.getDelivery()).toBe('app_stream');
    });

    it('should get/set is_enabled', () => {
      entity.setIsEnabled(false);
      expect(entity.getIsEnabled()).toBe(false);
    });

    it('should get/set config', () => {
      entity.setConfig({ region: 'eu-west-1' });
      expect(entity.getConfig()).toEqual({ region: 'eu-west-1' });
    });

    it('should get/set created_dt', () => {
      entity.setCreatedDt('2025-03-01T00:00:00Z');
      expect(entity.getCreatedDt()).toBe('2025-03-01T00:00:00Z');
    });

    it('should get/set updated_dt', () => {
      entity.setUpdatedDt('2025-04-01T00:00:00Z');
      expect(entity.getUpdatedDt()).toBe('2025-04-01T00:00:00Z');
    });
  });

  describe('setProvider validation', () => {
    it('should throw on invalid provider', () => {
      const entity = new StorageBackendEntity();
      expect(() => entity.setProvider('invalid_provider')).toThrow('Invalid provider: invalid_provider');
    });

    it('should accept all valid providers', () => {
      const entity = new StorageBackendEntity();
      Object.values(StorageBackendEntity.PROVIDER).forEach(provider => {
        expect(() => entity.setProvider(provider)).not.toThrow();
      });
    });
  });

  describe('setDelivery validation', () => {
    it('should throw on invalid delivery', () => {
      const entity = new StorageBackendEntity();
      expect(() => entity.setDelivery('invalid_delivery')).toThrow('Invalid delivery: invalid_delivery');
    });

    it('should accept all valid deliveries', () => {
      const entity = new StorageBackendEntity();
      Object.values(StorageBackendEntity.DELIVERY).forEach(delivery => {
        expect(() => entity.setDelivery(delivery)).not.toThrow();
      });
    });
  });

  describe('static PROVIDER', () => {
    it('should have all expected provider values', () => {
      expect(StorageBackendEntity.PROVIDER).toEqual({
        AWS_S3: 'aws_s3',
        AZURE_BLOB: 'azure_blob',
        GCP_GCS: 'gcp_gcs',
        MINIO_S3: 'minio_s3',
        FILESYSTEM: 'filesystem',
        SFTP: 'sftp',
        LOCAL_FS: 'local_fs'
      });
    });
  });

  describe('static DELIVERY', () => {
    it('should have all expected delivery values', () => {
      expect(StorageBackendEntity.DELIVERY).toEqual({
        CLOUDFRONT_SIGNED_URL: 'cloudfront_signed_url',
        CLOUDFRONT_SIGNED_COOKIE: 'cloudfront_signed_cookie',
        AZURE_CDN_TOKEN: 'azure_cdn_token',
        GCP_CDN_SIGNED_URL: 'gcp_cdn_signed_url',
        APP_STREAM: 'app_stream',
        NGINX_SIGNED_URL: 'nginx_signed_url',
        DIRECT: 'direct'
      });
    });
  });

  describe('logic methods', () => {
    it('isEnabled() should return true when is_enabled is true', () => {
      const entity = new StorageBackendEntity();
      expect(entity.isEnabled()).toBe(true);
    });

    it('isEnabled() should return false when is_enabled is false', () => {
      const entity = new StorageBackendEntity({ is_enabled: false });
      expect(entity.isEnabled()).toBe(false);
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(StorageBackendEntity.schema);
      expect(keys).toEqual([
        'storage_backend_id', 'name', 'provider', 'delivery',
        'is_enabled', 'config', 'created_dt', 'updated_dt'
      ]);
    });

    it('should have correct default values', () => {
      expect(StorageBackendEntity.schema.storage_backend_id).toBeNull();
      expect(StorageBackendEntity.schema.name).toBeNull();
      expect(StorageBackendEntity.schema.provider).toBeNull();
      expect(StorageBackendEntity.schema.delivery).toBeNull();
      expect(StorageBackendEntity.schema.is_enabled).toBe(true);
      expect(StorageBackendEntity.schema.config).toEqual({});
      expect(StorageBackendEntity.schema.created_dt).toBeNull();
      expect(StorageBackendEntity.schema.updated_dt).toBeNull();
    });
  });

  describe('validation', () => {
    it('should be valid when name, provider, and delivery are provided', () => {
      const entity = new StorageBackendEntity({
        name: 'Test Backend',
        provider: 'aws_s3',
        delivery: 'cloudfront_signed_url'
      });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when name is empty string', () => {
      const entity = new StorageBackendEntity({
        name: '',
        provider: 'aws_s3',
        delivery: 'cloudfront_signed_url'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when provider is missing', () => {
      const entity = new StorageBackendEntity({
        name: 'Test Backend',
        delivery: 'cloudfront_signed_url'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when delivery is missing', () => {
      const entity = new StorageBackendEntity({
        name: 'Test Backend',
        provider: 'aws_s3'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when all required fields are missing', () => {
      const entity = new StorageBackendEntity();
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when provider is not in allowed list', () => {
      const entity = new StorageBackendEntity({
        name: 'Test Backend',
        provider: 'invalid',
        delivery: 'cloudfront_signed_url'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when delivery is not in allowed list', () => {
      const entity = new StorageBackendEntity({
        name: 'Test Backend',
        provider: 'aws_s3',
        delivery: 'invalid'
      });
      expect(entity.isValid()).toBe(false);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new StorageBackendEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
