const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let AssetTagEntity;
beforeAll(() => {
  AssetTagEntity = require(globalThis.applicationPath('/application/entity/asset-tag-entity'));
});

describe('AssetTagEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new AssetTagEntity();
      expect(entity.getFileId()).toBeNull();
      expect(entity.getTagId()).toBeNull();
      expect(entity.getCreatedDt()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        file_id: 'f-1',
        tag_id: 'tag-1',
        created_dt: '2025-01-01T00:00:00Z'
      };
      const entity = new AssetTagEntity(data);
      expect(entity.getFileId()).toBe('f-1');
      expect(entity.getTagId()).toBe('tag-1');
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new AssetTagEntity();
    });

    it('should get/set file_id', () => {
      entity.setFileId('f-100');
      expect(entity.getFileId()).toBe('f-100');
    });

    it('should get/set tag_id', () => {
      entity.setTagId('tag-200');
      expect(entity.getTagId()).toBe('tag-200');
    });

    it('should get/set created_dt', () => {
      entity.setCreatedDt('2025-06-01T00:00:00Z');
      expect(entity.getCreatedDt()).toBe('2025-06-01T00:00:00Z');
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(AssetTagEntity.schema);
      expect(keys).toEqual(['file_id', 'tag_id', 'created_dt']);
    });

    it('should have all schema defaults as null', () => {
      Object.values(AssetTagEntity.schema).forEach(val => {
        expect(val).toBeNull();
      });
    });
  });

  describe('validation', () => {
    it('should be valid when file_id and tag_id are provided', () => {
      const entity = new AssetTagEntity({ file_id: 'f-1', tag_id: 'tag-1' });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when file_id is missing', () => {
      const entity = new AssetTagEntity({ tag_id: 'tag-1' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when tag_id is missing', () => {
      const entity = new AssetTagEntity({ file_id: 'f-1' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when both required fields are missing', () => {
      const entity = new AssetTagEntity();
      expect(entity.isValid()).toBe(false);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new AssetTagEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
