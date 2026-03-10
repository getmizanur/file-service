const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let CollectionAssetEntity;
beforeAll(() => {
  CollectionAssetEntity = require(globalThis.applicationPath('/application/entity/collection-asset-entity'));
});

describe('CollectionAssetEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new CollectionAssetEntity();
      expect(entity.getCollectionId()).toBeNull();
      expect(entity.getFileId()).toBeNull();
      expect(entity.getCreatedDt()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        collection_id: 'col-1',
        file_id: 'f-1',
        created_dt: '2025-01-01T00:00:00Z'
      };
      const entity = new CollectionAssetEntity(data);
      expect(entity.getCollectionId()).toBe('col-1');
      expect(entity.getFileId()).toBe('f-1');
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new CollectionAssetEntity();
    });

    it('should get/set collection_id', () => {
      entity.setCollectionId('col-100');
      expect(entity.getCollectionId()).toBe('col-100');
    });

    it('should get/set file_id', () => {
      entity.setFileId('f-200');
      expect(entity.getFileId()).toBe('f-200');
    });

    it('should get/set created_dt', () => {
      entity.setCreatedDt('2025-06-01T00:00:00Z');
      expect(entity.getCreatedDt()).toBe('2025-06-01T00:00:00Z');
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(CollectionAssetEntity.schema);
      expect(keys).toEqual(['collection_id', 'file_id', 'created_dt']);
    });

    it('should have all schema defaults as null', () => {
      Object.values(CollectionAssetEntity.schema).forEach(val => {
        expect(val).toBeNull();
      });
    });
  });

  describe('validation', () => {
    it('should be valid when collection_id and file_id are provided', () => {
      const entity = new CollectionAssetEntity({ collection_id: 'col-1', file_id: 'f-1' });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when collection_id is missing', () => {
      const entity = new CollectionAssetEntity({ file_id: 'f-1' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when file_id is missing', () => {
      const entity = new CollectionAssetEntity({ collection_id: 'col-1' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when both required fields are missing', () => {
      const entity = new CollectionAssetEntity();
      expect(entity.isValid()).toBe(false);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new CollectionAssetEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
