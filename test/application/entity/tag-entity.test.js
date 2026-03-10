const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let TagEntity;
beforeAll(() => {
  TagEntity = require(globalThis.applicationPath('/application/entity/tag-entity'));
});

describe('TagEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new TagEntity();
      expect(entity.getTagId()).toBeNull();
      expect(entity.getTenantId()).toBeNull();
      expect(entity.getName()).toBeNull();
      expect(entity.getCreatedDt()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        tag_id: 'tag-1',
        tenant_id: 't-1',
        name: 'Important',
        created_dt: '2025-01-01T00:00:00Z'
      };
      const entity = new TagEntity(data);
      expect(entity.getTagId()).toBe('tag-1');
      expect(entity.getTenantId()).toBe('t-1');
      expect(entity.getName()).toBe('Important');
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new TagEntity();
    });

    it('should get/set tag_id', () => {
      entity.setTagId('tag-100');
      expect(entity.getTagId()).toBe('tag-100');
    });

    it('should get/set tenant_id', () => {
      entity.setTenantId('t-200');
      expect(entity.getTenantId()).toBe('t-200');
    });

    it('should get/set name', () => {
      entity.setName('Archived');
      expect(entity.getName()).toBe('Archived');
    });

    it('should get/set created_dt', () => {
      entity.setCreatedDt('2025-06-01T00:00:00Z');
      expect(entity.getCreatedDt()).toBe('2025-06-01T00:00:00Z');
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(TagEntity.schema);
      expect(keys).toEqual(['tag_id', 'tenant_id', 'name', 'created_dt']);
    });

    it('should have all schema defaults as null', () => {
      Object.values(TagEntity.schema).forEach(val => {
        expect(val).toBeNull();
      });
    });
  });

  describe('validation', () => {
    it('should be valid when tenant_id and name are provided', () => {
      const entity = new TagEntity({ tenant_id: 't-1', name: 'Test' });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when tenant_id is missing', () => {
      const entity = new TagEntity({ name: 'Test' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when name is explicitly set to empty string', () => {
      const entity = new TagEntity({ tenant_id: 't-1', name: '' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when both required fields are missing', () => {
      const entity = new TagEntity();
      expect(entity.isValid()).toBe(false);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new TagEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
