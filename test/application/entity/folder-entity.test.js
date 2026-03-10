const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FolderEntity;
beforeAll(() => {
  FolderEntity = require(globalThis.applicationPath('/application/entity/folder-entity'));
});

describe('FolderEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new FolderEntity();
      expect(entity.getFolderId()).toBeNull();
      expect(entity.getTenantId()).toBeNull();
      expect(entity.getParentFolderId()).toBeNull();
      expect(entity.getName()).toBeNull();
      expect(entity.getCreatedBy()).toBeNull();
      expect(entity.getCreatedDt()).toBeNull();
      expect(entity.getDeletedAt()).toBeNull();
      expect(entity.getDeletedBy()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        folder_id: 'folder-1',
        tenant_id: 'tenant-1',
        parent_folder_id: 'parent-1',
        name: 'My Folder',
        created_by: 'user-1',
        created_dt: '2025-01-01T00:00:00Z',
        owner: 'owner-1',
        deleted_at: null,
        deleted_by: null
      };
      const entity = new FolderEntity(data);
      expect(entity.getFolderId()).toBe('folder-1');
      expect(entity.getTenantId()).toBe('tenant-1');
      expect(entity.getParentFolderId()).toBe('parent-1');
      expect(entity.getName()).toBe('My Folder');
      expect(entity.getCreatedBy()).toBe('user-1');
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
      expect(entity.getDeletedAt()).toBeNull();
      expect(entity.getDeletedBy()).toBeNull();
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new FolderEntity();
    });

    it('should get/set folder_id', () => {
      entity.setFolderId('f-100');
      expect(entity.getFolderId()).toBe('f-100');
    });

    it('should get/set tenant_id', () => {
      entity.setTenantId('t-200');
      expect(entity.getTenantId()).toBe('t-200');
    });

    it('should get/set parent_folder_id', () => {
      entity.setParentFolderId('pf-300');
      expect(entity.getParentFolderId()).toBe('pf-300');
    });

    it('should get/set name', () => {
      entity.setName('Documents');
      expect(entity.getName()).toBe('Documents');
    });

    it('should get/set created_by', () => {
      entity.setCreatedBy('user-5');
      expect(entity.getCreatedBy()).toBe('user-5');
    });

    it('should get/set created_dt', () => {
      entity.setCreatedDt('2025-06-15T12:00:00Z');
      expect(entity.getCreatedDt()).toBe('2025-06-15T12:00:00Z');
    });

    it('should get/set deleted_at', () => {
      entity.setDeletedAt('2025-07-01T00:00:00Z');
      expect(entity.getDeletedAt()).toBe('2025-07-01T00:00:00Z');
    });

    it('should get/set deleted_by', () => {
      entity.setDeletedBy('user-99');
      expect(entity.getDeletedBy()).toBe('user-99');
    });
  });

  describe('logic methods', () => {
    it('isRoot() should return true when parent_folder_id is null', () => {
      const entity = new FolderEntity();
      expect(entity.isRoot()).toBe(true);
    });

    it('isRoot() should return false when parent_folder_id is set', () => {
      const entity = new FolderEntity({ parent_folder_id: 'pf-1' });
      expect(entity.isRoot()).toBe(false);
    });

    it('isDeleted() should return false when deleted_at is null', () => {
      const entity = new FolderEntity();
      expect(entity.isDeleted()).toBe(false);
    });

    it('isDeleted() should return true when deleted_at is set', () => {
      const entity = new FolderEntity({ deleted_at: '2025-07-01T00:00:00Z' });
      expect(entity.isDeleted()).toBe(true);
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(FolderEntity.schema);
      expect(keys).toEqual([
        'folder_id', 'tenant_id', 'parent_folder_id', 'name',
        'created_by', 'created_dt', 'owner', 'deleted_at', 'deleted_by'
      ]);
    });

    it('should have all schema defaults as null', () => {
      Object.values(FolderEntity.schema).forEach(val => {
        expect(val).toBeNull();
      });
    });
  });

  describe('validation', () => {
    it('should be valid when tenant_id and name are provided', () => {
      const entity = new FolderEntity({ tenant_id: 't-1', name: 'Test' });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when tenant_id is missing', () => {
      const entity = new FolderEntity({ name: 'Test' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when name is missing', () => {
      const entity = new FolderEntity({ tenant_id: 't-1' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when both tenant_id and name are missing', () => {
      const entity = new FolderEntity();
      expect(entity.isValid()).toBe(false);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new FolderEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
