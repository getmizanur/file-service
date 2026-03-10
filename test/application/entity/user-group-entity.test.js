const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let UserGroupEntity;
beforeAll(() => {
  UserGroupEntity = require(globalThis.applicationPath('/application/entity/user-group-entity'));
});

describe('UserGroupEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new UserGroupEntity();
      expect(entity.getGroupId()).toBeNull();
      expect(entity.getTenantId()).toBeNull();
      expect(entity.getName()).toBeNull();
      expect(entity.getCreatedDt()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        group_id: 'grp-1',
        tenant_id: 't-1',
        name: 'Editors',
        created_dt: '2025-01-01T00:00:00Z'
      };
      const entity = new UserGroupEntity(data);
      expect(entity.getGroupId()).toBe('grp-1');
      expect(entity.getTenantId()).toBe('t-1');
      expect(entity.getName()).toBe('Editors');
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new UserGroupEntity();
    });

    it('should get/set group_id', () => {
      entity.setGroupId('grp-100');
      expect(entity.getGroupId()).toBe('grp-100');
    });

    it('should get/set tenant_id', () => {
      entity.setTenantId('t-200');
      expect(entity.getTenantId()).toBe('t-200');
    });

    it('should get/set name', () => {
      entity.setName('Reviewers');
      expect(entity.getName()).toBe('Reviewers');
    });

    it('should get/set created_dt', () => {
      entity.setCreatedDt('2025-06-01T00:00:00Z');
      expect(entity.getCreatedDt()).toBe('2025-06-01T00:00:00Z');
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(UserGroupEntity.schema);
      expect(keys).toEqual(['group_id', 'tenant_id', 'name', 'created_dt']);
    });

    it('should have all schema defaults as null', () => {
      Object.values(UserGroupEntity.schema).forEach(val => {
        expect(val).toBeNull();
      });
    });
  });

  describe('validation', () => {
    it('should be valid when tenant_id and name are provided', () => {
      const entity = new UserGroupEntity({ tenant_id: 't-1', name: 'Editors' });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when tenant_id is missing', () => {
      const entity = new UserGroupEntity({ name: 'Editors' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when name is explicitly set to empty string', () => {
      const entity = new UserGroupEntity({ tenant_id: 't-1', name: '' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when both required fields are missing', () => {
      const entity = new UserGroupEntity();
      expect(entity.isValid()).toBe(false);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new UserGroupEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
