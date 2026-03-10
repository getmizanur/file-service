const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let IntegrationPolicyOverrideEntity;
beforeAll(() => {
  IntegrationPolicyOverrideEntity = require(globalThis.applicationPath('/application/entity/integration-policy-override-entity'));
});

describe('IntegrationPolicyOverrideEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new IntegrationPolicyOverrideEntity();
      expect(entity.getIntegrationId()).toBeNull();
      expect(entity.getStorageBackendId()).toBeNull();
      expect(entity.getKeyTemplate()).toBeNull();
      expect(entity.getPresignedUrlTtlSeconds()).toBeNull();
      expect(entity.getRetentionDays()).toBeNull();
      expect(entity.getAvRequired()).toBeNull();
      expect(entity.getAllowedMimeTypes()).toBeNull();
      expect(entity.getDefaultVisibility()).toBeNull();
      expect(entity.getMaxUploadSizeBytes()).toBeNull();
      expect(entity.getUpdatedDt()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        integration_id: 'int-1',
        storage_backend_id: 'sb-1',
        key_template: '{{tenant}}/{{file}}',
        presigned_url_ttl_seconds: 1800,
        retention_days: 90,
        av_required: true,
        allowed_mime_types: ['image/png'],
        default_visibility: 'private',
        max_upload_size_bytes: 10485760,
        updated_dt: '2025-06-01T00:00:00Z'
      };
      const entity = new IntegrationPolicyOverrideEntity(data);
      expect(entity.getIntegrationId()).toBe('int-1');
      expect(entity.getStorageBackendId()).toBe('sb-1');
      expect(entity.getKeyTemplate()).toBe('{{tenant}}/{{file}}');
      expect(entity.getPresignedUrlTtlSeconds()).toBe(1800);
      expect(entity.getRetentionDays()).toBe(90);
      expect(entity.getAvRequired()).toBe(true);
      expect(entity.getAllowedMimeTypes()).toEqual(['image/png']);
      expect(entity.getDefaultVisibility()).toBe('private');
      expect(entity.getMaxUploadSizeBytes()).toBe(10485760);
      expect(entity.getUpdatedDt()).toBe('2025-06-01T00:00:00Z');
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new IntegrationPolicyOverrideEntity();
    });

    it('should get/set integration_id', () => {
      entity.setIntegrationId('int-100');
      expect(entity.getIntegrationId()).toBe('int-100');
    });

    it('should get/set storage_backend_id', () => {
      entity.setStorageBackendId('sb-200');
      expect(entity.getStorageBackendId()).toBe('sb-200');
    });

    it('should get/set key_template', () => {
      entity.setKeyTemplate('{{tenant}}/{{file}}');
      expect(entity.getKeyTemplate()).toBe('{{tenant}}/{{file}}');
    });

    it('should get/set presigned_url_ttl_seconds', () => {
      entity.setPresignedUrlTtlSeconds(3600);
      expect(entity.getPresignedUrlTtlSeconds()).toBe(3600);
    });

    it('should get/set retention_days', () => {
      entity.setRetentionDays(30);
      expect(entity.getRetentionDays()).toBe(30);
    });

    it('should get/set av_required', () => {
      entity.setAvRequired(false);
      expect(entity.getAvRequired()).toBe(false);
    });

    it('should get/set allowed_mime_types', () => {
      entity.setAllowedMimeTypes(['application/pdf', 'image/jpeg']);
      expect(entity.getAllowedMimeTypes()).toEqual(['application/pdf', 'image/jpeg']);
    });

    it('should get/set default_visibility', () => {
      entity.setDefaultVisibility('public');
      expect(entity.getDefaultVisibility()).toBe('public');
    });

    it('should get/set max_upload_size_bytes', () => {
      entity.setMaxUploadSizeBytes(52428800);
      expect(entity.getMaxUploadSizeBytes()).toBe(52428800);
    });

    it('should get/set updated_dt', () => {
      entity.setUpdatedDt('2025-07-01T00:00:00Z');
      expect(entity.getUpdatedDt()).toBe('2025-07-01T00:00:00Z');
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(IntegrationPolicyOverrideEntity.schema);
      expect(keys).toEqual([
        'integration_id', 'storage_backend_id', 'key_template',
        'presigned_url_ttl_seconds', 'retention_days', 'av_required',
        'allowed_mime_types', 'default_visibility', 'max_upload_size_bytes',
        'updated_dt'
      ]);
    });

    it('should have all schema defaults as null', () => {
      Object.values(IntegrationPolicyOverrideEntity.schema).forEach(val => {
        expect(val).toBeNull();
      });
    });
  });

  describe('validation', () => {
    it('should be valid when integration_id is provided', () => {
      const entity = new IntegrationPolicyOverrideEntity({ integration_id: 'int-1' });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when integration_id is missing', () => {
      const entity = new IntegrationPolicyOverrideEntity();
      expect(entity.isValid()).toBe(false);
    });

    it('should be valid with only integration_id and no other fields', () => {
      const entity = new IntegrationPolicyOverrideEntity({ integration_id: 'int-1' });
      expect(entity.isValid()).toBe(true);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new IntegrationPolicyOverrideEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
