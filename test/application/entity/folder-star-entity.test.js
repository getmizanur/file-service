const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FolderStarEntity;
beforeAll(() => {
  FolderStarEntity = require(globalThis.applicationPath('/application/entity/folder-star-entity'));
});

describe('FolderStarEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new FolderStarEntity();
      expect(entity.getTenantId()).toBeNull();
      expect(entity.getFolderId()).toBeNull();
      expect(entity.getUserId()).toBeNull();
      expect(entity.getCreatedDt()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        tenant_id: 'tenant-1',
        folder_id: 'folder-1',
        user_id: 'user-1',
        created_dt: '2025-01-01T00:00:00Z'
      };
      const entity = new FolderStarEntity(data);
      expect(entity.getTenantId()).toBe('tenant-1');
      expect(entity.getFolderId()).toBe('folder-1');
      expect(entity.getUserId()).toBe('user-1');
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new FolderStarEntity();
    });

    it('should get/set tenant_id', () => {
      entity.setTenantId('t-100');
      expect(entity.getTenantId()).toBe('t-100');
    });

    it('should get/set folder_id', () => {
      entity.setFolderId('f-200');
      expect(entity.getFolderId()).toBe('f-200');
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
      const keys = Object.keys(FolderStarEntity.schema);
      expect(keys).toEqual(['tenant_id', 'folder_id', 'user_id', 'created_dt']);
    });

    it('should have all schema defaults as null', () => {
      Object.values(FolderStarEntity.schema).forEach(val => {
        expect(val).toBeNull();
      });
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new FolderStarEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
