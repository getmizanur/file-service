const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let IntegrationEntity;
beforeAll(() => {
  IntegrationEntity = require(globalThis.applicationPath('/application/entity/integration-entity'));
});

describe('IntegrationEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new IntegrationEntity();
      expect(entity.getIntegrationId()).toBeNull();
      expect(entity.getTenantId()).toBeNull();
      expect(entity.getCode()).toBeNull();
      expect(entity.getName()).toBeNull();
      expect(entity.getStatus()).toBe('active');
      expect(entity.getWebhookUrl()).toBeNull();
      expect(entity.getWebhookSecretHash()).toBeNull();
      expect(entity.getCreatedDt()).toBeNull();
      expect(entity.getUpdatedDt()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        integration_id: 'int-1',
        tenant_id: 't-1',
        code: 'slack',
        name: 'Slack Integration',
        status: 'active',
        webhook_url: 'https://hooks.slack.com/test',
        webhook_secret_hash: 'secret123',
        created_dt: '2025-01-01T00:00:00Z',
        updated_dt: '2025-02-01T00:00:00Z'
      };
      const entity = new IntegrationEntity(data);
      expect(entity.getIntegrationId()).toBe('int-1');
      expect(entity.getTenantId()).toBe('t-1');
      expect(entity.getCode()).toBe('slack');
      expect(entity.getName()).toBe('Slack Integration');
      expect(entity.getStatus()).toBe('active');
      expect(entity.getWebhookUrl()).toBe('https://hooks.slack.com/test');
      expect(entity.getWebhookSecretHash()).toBe('secret123');
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
      expect(entity.getUpdatedDt()).toBe('2025-02-01T00:00:00Z');
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new IntegrationEntity();
    });

    it('should get/set integration_id', () => {
      entity.setIntegrationId('int-100');
      expect(entity.getIntegrationId()).toBe('int-100');
    });

    it('should get/set tenant_id', () => {
      entity.setTenantId('t-200');
      expect(entity.getTenantId()).toBe('t-200');
    });

    it('should get/set code', () => {
      entity.setCode('github');
      expect(entity.getCode()).toBe('github');
    });

    it('should get/set name', () => {
      entity.setName('GitHub Integration');
      expect(entity.getName()).toBe('GitHub Integration');
    });

    it('should get/set status with valid value', () => {
      entity.setStatus('inactive');
      expect(entity.getStatus()).toBe('inactive');
    });

    it('should get/set webhook_url', () => {
      entity.setWebhookUrl('https://example.com/hook');
      expect(entity.getWebhookUrl()).toBe('https://example.com/hook');
    });

    it('should get/set webhook_secret_hash', () => {
      entity.setWebhookSecretHash('newsecret');
      expect(entity.getWebhookSecretHash()).toBe('newsecret');
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

  describe('setStatus validation', () => {
    it('should throw on invalid status', () => {
      const entity = new IntegrationEntity();
      expect(() => entity.setStatus('suspended')).toThrow('Invalid status: suspended');
    });

    it('should accept all valid statuses', () => {
      const entity = new IntegrationEntity();
      Object.values(IntegrationEntity.STATUS).forEach(status => {
        expect(() => entity.setStatus(status)).not.toThrow();
      });
    });
  });

  describe('static STATUS', () => {
    it('should have all expected status values', () => {
      expect(IntegrationEntity.STATUS).toEqual({
        ACTIVE: 'active',
        INACTIVE: 'inactive'
      });
    });
  });

  describe('logic methods', () => {
    it('isActive() should return true when status is active', () => {
      const entity = new IntegrationEntity({ status: 'active' });
      expect(entity.isActive()).toBe(true);
    });

    it('isActive() should return true by default', () => {
      const entity = new IntegrationEntity();
      expect(entity.isActive()).toBe(true);
    });

    it('isActive() should return false when status is inactive', () => {
      const entity = new IntegrationEntity({ status: 'inactive' });
      expect(entity.isActive()).toBe(false);
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(IntegrationEntity.schema);
      expect(keys).toEqual([
        'integration_id', 'tenant_id', 'code', 'name', 'status',
        'webhook_url', 'webhook_secret_hash', 'created_dt', 'updated_dt'
      ]);
    });

    it('should have correct default values', () => {
      expect(IntegrationEntity.schema.integration_id).toBeNull();
      expect(IntegrationEntity.schema.tenant_id).toBeNull();
      expect(IntegrationEntity.schema.code).toBeNull();
      expect(IntegrationEntity.schema.name).toBeNull();
      expect(IntegrationEntity.schema.status).toBe('active');
      expect(IntegrationEntity.schema.webhook_url).toBeNull();
      expect(IntegrationEntity.schema.webhook_secret_hash).toBeNull();
      expect(IntegrationEntity.schema.created_dt).toBeNull();
      expect(IntegrationEntity.schema.updated_dt).toBeNull();
    });
  });

  describe('validation', () => {
    it('should be valid when tenant_id, code, and name are provided', () => {
      const entity = new IntegrationEntity({
        tenant_id: 't-1',
        code: 'slack',
        name: 'Slack'
      });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when tenant_id is missing', () => {
      const entity = new IntegrationEntity({ code: 'slack', name: 'Slack' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when code is empty string', () => {
      const entity = new IntegrationEntity({ tenant_id: 't-1', code: '', name: 'Slack' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when name is empty string', () => {
      const entity = new IntegrationEntity({ tenant_id: 't-1', code: 'slack', name: '' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when all required fields are missing', () => {
      const entity = new IntegrationEntity();
      expect(entity.isValid()).toBe(false);
    });

  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new IntegrationEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
