const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let TenantEntity;
beforeAll(() => {
  TenantEntity = require(globalThis.applicationPath('/application/entity/tenant-entity'));
});

describe('TenantEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data and have defaults', () => {
      const entity = new TenantEntity();
      expect(entity.getTenantId()).toBeNull();
      expect(entity.getSlug()).toBeNull();
      expect(entity.getName()).toBeNull();
      expect(entity.getStatus()).toBe('active');
      expect(entity.getCreatedDt()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        tenant_id: 'tenant-1',
        slug: 'my-tenant',
        name: 'My Tenant',
        status: 'active',
        created_dt: '2025-01-01T00:00:00Z'
      };
      const entity = new TenantEntity(data);
      expect(entity.getTenantId()).toBe('tenant-1');
      expect(entity.getSlug()).toBe('my-tenant');
      expect(entity.getName()).toBe('My Tenant');
      expect(entity.getStatus()).toBe('active');
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(TenantEntity.schema);
      expect(keys).toEqual([
        'tenant_id', 'slug', 'name', 'status', 'created_dt'
      ]);
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new TenantEntity();
    });

    it('should get/set tenant_id', () => {
      entity.setTenantId('t-100');
      expect(entity.getTenantId()).toBe('t-100');
    });

    it('should get/set slug', () => {
      entity.setSlug('test-slug');
      expect(entity.getSlug()).toBe('test-slug');
    });

    it('should get/set name', () => {
      entity.setName('Test Tenant');
      expect(entity.getName()).toBe('Test Tenant');
    });

    it('should get/set status', () => {
      entity.setStatus('inactive');
      expect(entity.getStatus()).toBe('inactive');
    });

    it('should get/set created_dt', () => {
      entity.setCreatedDt('2025-06-15T12:00:00Z');
      expect(entity.getCreatedDt()).toBe('2025-06-15T12:00:00Z');
    });
  });

  describe('logic methods', () => {
    it('isActive() should return true when status is active', () => {
      const entity = new TenantEntity();
      expect(entity.isActive()).toBe(true);
    });

    it('isActive() should return false when status is inactive', () => {
      const entity = new TenantEntity({ status: 'inactive' });
      expect(entity.isActive()).toBe(false);
    });

    it('isActive() should return false when status is any non-active value', () => {
      const entity = new TenantEntity({ status: 'suspended' });
      expect(entity.isActive()).toBe(false);
    });
  });

  describe('validation', () => {
    it('should be valid with slug, name, and status', () => {
      const entity = new TenantEntity({
        slug: 'my-slug',
        name: 'My Tenant',
        status: 'active'
      });
      expect(entity.isValid()).toBe(true);
    });

    it('should be valid with inactive status', () => {
      const entity = new TenantEntity({
        slug: 'my-slug',
        name: 'My Tenant',
        status: 'inactive'
      });
      expect(entity.isValid()).toBe(true);
    });

    it('should still be valid when slug is null (schema default coerces to string)', () => {
      const entity = new TenantEntity({
        name: 'My Tenant',
        status: 'active'
      });
      // slug defaults to null from schema, which gets coerced to "null" string
      expect(entity.isValid()).toBe(true);
    });

    it('should still be valid when name is null (schema default coerces to string)', () => {
      const entity = new TenantEntity({
        slug: 'my-slug',
        status: 'active'
      });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when status is null', () => {
      const entity = new TenantEntity({
        slug: 'my-slug',
        name: 'My Tenant',
        status: null
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when status is not in allowed values', () => {
      const entity = new TenantEntity({
        slug: 'my-slug',
        name: 'My Tenant',
        status: 'suspended'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be valid with no data because defaults satisfy validation', () => {
      const entity = new TenantEntity();
      // status defaults to 'active' which is valid, slug/name default to null
      // which gets coerced to "null" string passing StringLength
      expect(entity.isValid()).toBe(true);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new TenantEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
