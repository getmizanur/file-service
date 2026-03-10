const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FileStarEntity;
beforeAll(() => {
  FileStarEntity = require(globalThis.applicationPath('/application/entity/file-star-entity'));
});

describe('FileStarEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new FileStarEntity();
      expect(entity.getTenantId()).toBeNull();
      expect(entity.getFileId()).toBeNull();
      expect(entity.getUserId()).toBeNull();
      expect(entity.getCreatedDt()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        tenant_id: 'tenant-1',
        file_id: 'file-1',
        user_id: 'user-1',
        created_dt: '2025-01-01T00:00:00Z'
      };
      const entity = new FileStarEntity(data);
      expect(entity.getTenantId()).toBe('tenant-1');
      expect(entity.getFileId()).toBe('file-1');
      expect(entity.getUserId()).toBe('user-1');
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new FileStarEntity();
    });

    it('should get/set tenant_id', () => {
      entity.setTenantId('t-100');
      expect(entity.getTenantId()).toBe('t-100');
    });

    it('should get/set file_id', () => {
      entity.setFileId('f-200');
      expect(entity.getFileId()).toBe('f-200');
    });

    it('should get/set user_id', () => {
      entity.setUserId('u-300');
      expect(entity.getUserId()).toBe('u-300');
    });

    it('should get/set created_dt', () => {
      entity.setCreatedDt('2025-06-15T12:00:00Z');
      expect(entity.getCreatedDt()).toBe('2025-06-15T12:00:00Z');
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(FileStarEntity.schema);
      expect(keys).toEqual(['tenant_id', 'file_id', 'user_id', 'created_dt']);
    });

    it('should have all schema defaults as null', () => {
      Object.values(FileStarEntity.schema).forEach(val => {
        expect(val).toBeNull();
      });
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new FileStarEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
