const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let TenantPolicyEntity;
beforeAll(() => {
  TenantPolicyEntity = require(globalThis.applicationPath('/application/entity/tenant-policy-entity'));
});

describe('TenantPolicyEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new TenantPolicyEntity();
      expect(entity.getTenantId()).toBeNull();
      expect(entity.getStorageBackendId()).toBeNull();
      expect(entity.getKeyTemplate()).toBeNull();
      expect(entity.getPresignedUrlTtlSeconds()).toBe(900);
      expect(entity.getDefaultRetentionDays()).toBeNull();
      expect(entity.getAvRequired()).toBe(true);
      expect(entity.getAllowedMimeTypes()).toEqual([]);
      expect(entity.getDefaultVisibility()).toBe('private');
      expect(entity.getWebhookUrl()).toBeNull();
      expect(entity.getWebhookSecretHash()).toBeNull();
      expect(entity.getDerivativeKeyTemplate()).toBeNull();
      expect(entity.getUpdatedDt()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        tenant_id: 't-1',
        storage_backend_id: 'sb-1',
        key_template: '{{tenant}}/{{file}}',
        presigned_url_ttl_seconds: 3600,
        default_retention_days: 30,
        av_required: false,
        allowed_mime_types: ['image/png', 'image/jpeg'],
        default_visibility: 'public',
        webhook_url: 'https://example.com/hook',
        webhook_secret_hash: 'hash123',
        derivative_key_template: '{{tenant}}/derivatives/{{file}}',
        updated_dt: '2025-06-01T00:00:00Z'
      };
      const entity = new TenantPolicyEntity(data);
      expect(entity.getTenantId()).toBe('t-1');
      expect(entity.getStorageBackendId()).toBe('sb-1');
      expect(entity.getKeyTemplate()).toBe('{{tenant}}/{{file}}');
      expect(entity.getPresignedUrlTtlSeconds()).toBe(3600);
      expect(entity.getDefaultRetentionDays()).toBe(30);
      expect(entity.getAvRequired()).toBe(false);
      expect(entity.getAllowedMimeTypes()).toEqual(['image/png', 'image/jpeg']);
      expect(entity.getDefaultVisibility()).toBe('public');
      expect(entity.getWebhookUrl()).toBe('https://example.com/hook');
      expect(entity.getWebhookSecretHash()).toBe('hash123');
      expect(entity.getDerivativeKeyTemplate()).toBe('{{tenant}}/derivatives/{{file}}');
      expect(entity.getUpdatedDt()).toBe('2025-06-01T00:00:00Z');
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new TenantPolicyEntity();
    });

    it('should get/set tenant_id', () => {
      entity.setTenantId('t-100');
      expect(entity.getTenantId()).toBe('t-100');
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
      entity.setPresignedUrlTtlSeconds(1800);
      expect(entity.getPresignedUrlTtlSeconds()).toBe(1800);
    });

    it('should get/set default_retention_days', () => {
      entity.setDefaultRetentionDays(60);
      expect(entity.getDefaultRetentionDays()).toBe(60);
    });

    it('should get/set av_required', () => {
      entity.setAvRequired(false);
      expect(entity.getAvRequired()).toBe(false);
    });

    it('should get/set allowed_mime_types', () => {
      entity.setAllowedMimeTypes(['application/pdf']);
      expect(entity.getAllowedMimeTypes()).toEqual(['application/pdf']);
    });

    it('should get/set default_visibility with valid value', () => {
      entity.setDefaultVisibility('public');
      expect(entity.getDefaultVisibility()).toBe('public');
    });

    it('should get/set webhook_url', () => {
      entity.setWebhookUrl('https://example.com');
      expect(entity.getWebhookUrl()).toBe('https://example.com');
    });

    it('should get/set webhook_secret_hash', () => {
      entity.setWebhookSecretHash('secret');
      expect(entity.getWebhookSecretHash()).toBe('secret');
    });

    it('should get/set derivative_key_template', () => {
      entity.setDerivativeKeyTemplate('tmpl');
      expect(entity.getDerivativeKeyTemplate()).toBe('tmpl');
    });

    it('should get/set updated_dt', () => {
      entity.setUpdatedDt('2025-07-01T00:00:00Z');
      expect(entity.getUpdatedDt()).toBe('2025-07-01T00:00:00Z');
    });
  });

  describe('setDefaultVisibility validation', () => {
    it('should throw on invalid visibility', () => {
      const entity = new TenantPolicyEntity();
      expect(() => entity.setDefaultVisibility('restricted')).toThrow('Invalid visibility: restricted');
    });

    it('should accept all valid visibilities', () => {
      const entity = new TenantPolicyEntity();
      Object.values(TenantPolicyEntity.VISIBILITY).forEach(v => {
        expect(() => entity.setDefaultVisibility(v)).not.toThrow();
      });
    });
  });

  describe('static VISIBILITY', () => {
    it('should have all expected visibility values', () => {
      expect(TenantPolicyEntity.VISIBILITY).toEqual({
        PRIVATE: 'private',
        PUBLIC: 'public'
      });
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(TenantPolicyEntity.schema);
      expect(keys).toEqual([
        'tenant_id', 'storage_backend_id', 'key_template',
        'presigned_url_ttl_seconds', 'default_retention_days', 'av_required',
        'allowed_mime_types', 'default_visibility', 'webhook_url',
        'webhook_secret_hash', 'derivative_key_template', 'updated_dt'
      ]);
    });

    it('should have correct default values', () => {
      expect(TenantPolicyEntity.schema.tenant_id).toBeNull();
      expect(TenantPolicyEntity.schema.storage_backend_id).toBeNull();
      expect(TenantPolicyEntity.schema.key_template).toBeNull();
      expect(TenantPolicyEntity.schema.presigned_url_ttl_seconds).toBe(900);
      expect(TenantPolicyEntity.schema.default_retention_days).toBeNull();
      expect(TenantPolicyEntity.schema.av_required).toBe(true);
      expect(TenantPolicyEntity.schema.allowed_mime_types).toEqual([]);
      expect(TenantPolicyEntity.schema.default_visibility).toBe('private');
      expect(TenantPolicyEntity.schema.webhook_url).toBeNull();
      expect(TenantPolicyEntity.schema.webhook_secret_hash).toBeNull();
      expect(TenantPolicyEntity.schema.derivative_key_template).toBeNull();
      expect(TenantPolicyEntity.schema.updated_dt).toBeNull();
    });
  });

  describe('validation', () => {
    it('should be valid when storage_backend_id, key_template, and presigned_url_ttl_seconds are provided', () => {
      const entity = new TenantPolicyEntity({
        storage_backend_id: 'sb-1',
        key_template: '{{tenant}}/{{file}}',
        presigned_url_ttl_seconds: '900'
      });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when storage_backend_id is missing', () => {
      const entity = new TenantPolicyEntity({
        key_template: '{{tenant}}/{{file}}',
        presigned_url_ttl_seconds: '900'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when key_template is missing', () => {
      const entity = new TenantPolicyEntity({
        storage_backend_id: 'sb-1',
        presigned_url_ttl_seconds: '900'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when presigned_url_ttl_seconds is missing', () => {
      const entity = new TenantPolicyEntity({
        storage_backend_id: 'sb-1',
        key_template: '{{tenant}}/{{file}}',
        presigned_url_ttl_seconds: null
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when all required fields are missing', () => {
      const entity = new TenantPolicyEntity({
        presigned_url_ttl_seconds: null
      });
      expect(entity.isValid()).toBe(false);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new TenantPolicyEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
