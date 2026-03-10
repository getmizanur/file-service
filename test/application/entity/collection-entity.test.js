const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let CollectionEntity;
beforeAll(() => {
  CollectionEntity = require(globalThis.applicationPath('/application/entity/collection-entity'));
});

describe('CollectionEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new CollectionEntity();
      expect(entity.getCollectionId()).toBeNull();
      expect(entity.getTenantId()).toBeNull();
      expect(entity.getName()).toBeNull();
      expect(entity.getDescription()).toBeNull();
      expect(entity.getCreatedBy()).toBeNull();
      expect(entity.getCreatedDt()).toBeNull();
      expect(entity.getUpdatedDt()).toBeNull();
      expect(entity.getDeletedAt()).toBeNull();
      expect(entity.getDeletedBy()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        collection_id: 'col-1',
        tenant_id: 't-1',
        name: 'My Collection',
        description: 'A test collection',
        created_by: 'u-1',
        created_dt: '2025-01-01T00:00:00Z',
        updated_dt: '2025-02-01T00:00:00Z',
        deleted_at: null,
        deleted_by: null
      };
      const entity = new CollectionEntity(data);
      expect(entity.getCollectionId()).toBe('col-1');
      expect(entity.getTenantId()).toBe('t-1');
      expect(entity.getName()).toBe('My Collection');
      expect(entity.getDescription()).toBe('A test collection');
      expect(entity.getCreatedBy()).toBe('u-1');
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
      expect(entity.getUpdatedDt()).toBe('2025-02-01T00:00:00Z');
      expect(entity.getDeletedAt()).toBeNull();
      expect(entity.getDeletedBy()).toBeNull();
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new CollectionEntity();
    });

    it('should get/set collection_id', () => {
      entity.setCollectionId('col-100');
      expect(entity.getCollectionId()).toBe('col-100');
    });

    it('should get/set tenant_id', () => {
      entity.setTenantId('t-200');
      expect(entity.getTenantId()).toBe('t-200');
    });

    it('should get/set name', () => {
      entity.setName('Photos');
      expect(entity.getName()).toBe('Photos');
    });

    it('should get/set description', () => {
      entity.setDescription('Photo collection');
      expect(entity.getDescription()).toBe('Photo collection');
    });

    it('should get/set created_by', () => {
      entity.setCreatedBy('u-5');
      expect(entity.getCreatedBy()).toBe('u-5');
    });

    it('should get/set created_dt', () => {
      entity.setCreatedDt('2025-03-01T00:00:00Z');
      expect(entity.getCreatedDt()).toBe('2025-03-01T00:00:00Z');
    });

    it('should get/set updated_dt', () => {
      entity.setUpdatedDt('2025-04-01T00:00:00Z');
      expect(entity.getUpdatedDt()).toBe('2025-04-01T00:00:00Z');
    });

    it('should get/set deleted_at', () => {
      entity.setDeletedAt('2025-05-01T00:00:00Z');
      expect(entity.getDeletedAt()).toBe('2025-05-01T00:00:00Z');
    });

    it('should get/set deleted_by', () => {
      entity.setDeletedBy('u-99');
      expect(entity.getDeletedBy()).toBe('u-99');
    });
  });

  describe('logic methods', () => {
    it('isDeleted() should return false when deleted_at is null', () => {
      const entity = new CollectionEntity();
      expect(entity.isDeleted()).toBe(false);
    });

    it('isDeleted() should return true when deleted_at is set', () => {
      const entity = new CollectionEntity({ deleted_at: '2025-07-01T00:00:00Z' });
      expect(entity.isDeleted()).toBe(true);
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(CollectionEntity.schema);
      expect(keys).toEqual([
        'collection_id', 'tenant_id', 'name', 'description',
        'created_by', 'created_dt', 'updated_dt', 'deleted_at', 'deleted_by'
      ]);
    });

    it('should have all schema defaults as null', () => {
      Object.values(CollectionEntity.schema).forEach(val => {
        expect(val).toBeNull();
      });
    });
  });

  describe('validation', () => {
    it('should be valid when tenant_id, name, and created_by are provided', () => {
      const entity = new CollectionEntity({
        tenant_id: 't-1',
        name: 'Test',
        created_by: 'u-1'
      });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when tenant_id is missing', () => {
      const entity = new CollectionEntity({ name: 'Test', created_by: 'u-1' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when name is empty string', () => {
      const entity = new CollectionEntity({ tenant_id: 't-1', name: '', created_by: 'u-1' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when created_by is missing', () => {
      const entity = new CollectionEntity({ tenant_id: 't-1', name: 'Test' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when all required fields are missing', () => {
      const entity = new CollectionEntity();
      expect(entity.isValid()).toBe(false);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new CollectionEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
