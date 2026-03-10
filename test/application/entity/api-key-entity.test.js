const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let ApiKeyEntity;
beforeAll(() => {
  ApiKeyEntity = require(globalThis.applicationPath('/application/entity/api-key-entity'));
});

describe('ApiKeyEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new ApiKeyEntity();
      expect(entity.getApiKeyId()).toBeNull();
      expect(entity.getTenantId()).toBeNull();
      expect(entity.getIntegrationId()).toBeNull();
      expect(entity.getName()).toBeNull();
      expect(entity.getKeyHash()).toBeNull();
      expect(entity.getLastUsedDt()).toBeNull();
      expect(entity.getCreatedDt()).toBeNull();
      expect(entity.getRevokedDt()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        api_key_id: 'key-1',
        tenant_id: 'tenant-1',
        integration_id: 'int-1',
        name: 'My API Key',
        key_hash: 'hash123',
        last_used_dt: '2025-06-01T00:00:00Z',
        created_dt: '2025-01-01T00:00:00Z',
        revoked_dt: null
      };
      const entity = new ApiKeyEntity(data);
      expect(entity.getApiKeyId()).toBe('key-1');
      expect(entity.getTenantId()).toBe('tenant-1');
      expect(entity.getIntegrationId()).toBe('int-1');
      expect(entity.getName()).toBe('My API Key');
      expect(entity.getKeyHash()).toBe('hash123');
      expect(entity.getLastUsedDt()).toBe('2025-06-01T00:00:00Z');
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
      expect(entity.getRevokedDt()).toBeNull();
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new ApiKeyEntity();
    });

    it('should get/set api_key_id', () => {
      entity.setApiKeyId('k-100');
      expect(entity.getApiKeyId()).toBe('k-100');
    });

    it('should get/set tenant_id', () => {
      entity.setTenantId('t-200');
      expect(entity.getTenantId()).toBe('t-200');
    });

    it('should get/set integration_id', () => {
      entity.setIntegrationId('int-300');
      expect(entity.getIntegrationId()).toBe('int-300');
    });

    it('should get/set name', () => {
      entity.setName('Production Key');
      expect(entity.getName()).toBe('Production Key');
    });

    it('should get/set key_hash', () => {
      entity.setKeyHash('abc123hash');
      expect(entity.getKeyHash()).toBe('abc123hash');
    });

    it('should get/set last_used_dt', () => {
      entity.setLastUsedDt('2025-06-15T12:00:00Z');
      expect(entity.getLastUsedDt()).toBe('2025-06-15T12:00:00Z');
    });

    it('should get/set created_dt', () => {
      entity.setCreatedDt('2025-01-01T00:00:00Z');
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
    });

    it('should get/set revoked_dt', () => {
      entity.setRevokedDt('2025-07-01T00:00:00Z');
      expect(entity.getRevokedDt()).toBe('2025-07-01T00:00:00Z');
    });
  });

  describe('logic methods', () => {
    it('isRevoked() should return false when revoked_dt is null', () => {
      const entity = new ApiKeyEntity();
      expect(entity.isRevoked()).toBe(false);
    });

    it('isRevoked() should return true when revoked_dt is set', () => {
      const entity = new ApiKeyEntity({ revoked_dt: '2025-07-01T00:00:00Z' });
      expect(entity.isRevoked()).toBe(true);
    });

    it('isValidKey() should return true when not revoked', () => {
      const entity = new ApiKeyEntity();
      expect(entity.isValidKey()).toBe(true);
    });

    it('isValidKey() should return false when revoked', () => {
      const entity = new ApiKeyEntity({ revoked_dt: '2025-07-01T00:00:00Z' });
      expect(entity.isValidKey()).toBe(false);
    });

    it('revoke() should set revoked_dt to a Date', () => {
      const entity = new ApiKeyEntity();
      expect(entity.isRevoked()).toBe(false);
      entity.revoke();
      expect(entity.isRevoked()).toBe(true);
      expect(entity.getRevokedDt()).toBeInstanceOf(Date);
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(ApiKeyEntity.schema);
      expect(keys).toEqual([
        'api_key_id', 'tenant_id', 'integration_id', 'name',
        'key_hash', 'last_used_dt', 'created_dt', 'revoked_dt'
      ]);
    });

    it('should have all schema defaults as null', () => {
      Object.values(ApiKeyEntity.schema).forEach(val => {
        expect(val).toBeNull();
      });
    });
  });

  describe('validation', () => {
    it('should be valid when tenant_id, name, and key_hash are provided', () => {
      const entity = new ApiKeyEntity({
        tenant_id: 't-1', name: 'My Key', key_hash: 'hash123'
      });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when tenant_id is missing', () => {
      const entity = new ApiKeyEntity({
        name: 'My Key', key_hash: 'hash123'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when name is empty string', () => {
      const entity = new ApiKeyEntity({
        tenant_id: 't-1', key_hash: 'hash123', name: ''
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when key_hash is missing', () => {
      const entity = new ApiKeyEntity({
        tenant_id: 't-1', name: 'My Key'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when all required fields are missing', () => {
      const entity = new ApiKeyEntity();
      expect(entity.isValid()).toBe(false);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new ApiKeyEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
