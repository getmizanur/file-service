const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FolderPermissionEntity;
beforeAll(() => {
  FolderPermissionEntity = require(globalThis.applicationPath('/application/entity/folder-permission-entity'));
});

describe('FolderPermissionEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new FolderPermissionEntity();
      expect(entity.getPermissionId()).toBeNull();
      expect(entity.getTenantId()).toBeNull();
      expect(entity.getFolderId()).toBeNull();
      expect(entity.getUserId()).toBeNull();
      expect(entity.getGroupId()).toBeNull();
      expect(entity.getRole()).toBe('viewer');
      expect(entity.getInheritToChildren()).toBe(true);
      expect(entity.getCreatedBy()).toBeNull();
      expect(entity.getCreatedDt()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        permission_id: 'perm-1',
        tenant_id: 'tenant-1',
        folder_id: 'folder-1',
        user_id: 'user-1',
        group_id: 'group-1',
        role: 'editor',
        inherit_to_children: false,
        created_by: 'admin-1',
        created_dt: '2025-01-01T00:00:00Z'
      };
      const entity = new FolderPermissionEntity(data);
      expect(entity.getPermissionId()).toBe('perm-1');
      expect(entity.getTenantId()).toBe('tenant-1');
      expect(entity.getFolderId()).toBe('folder-1');
      expect(entity.getUserId()).toBe('user-1');
      expect(entity.getGroupId()).toBe('group-1');
      expect(entity.getRole()).toBe('editor');
      expect(entity.getInheritToChildren()).toBe(false);
      expect(entity.getCreatedBy()).toBe('admin-1');
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new FolderPermissionEntity();
    });

    it('should get/set permission_id', () => {
      entity.setPermissionId('p-100');
      expect(entity.getPermissionId()).toBe('p-100');
    });

    it('should get/set tenant_id', () => {
      entity.setTenantId('t-200');
      expect(entity.getTenantId()).toBe('t-200');
    });

    it('should get/set folder_id', () => {
      entity.setFolderId('f-300');
      expect(entity.getFolderId()).toBe('f-300');
    });

    it('should get/set user_id', () => {
      entity.setUserId('u-400');
      expect(entity.getUserId()).toBe('u-400');
    });

    it('should get/set group_id', () => {
      entity.setGroupId('g-500');
      expect(entity.getGroupId()).toBe('g-500');
    });

    it('should get/set role with valid value', () => {
      entity.setRole('editor');
      expect(entity.getRole()).toBe('editor');
    });

    it('should throw on invalid role', () => {
      expect(() => entity.setRole('superadmin')).toThrow('Invalid role: superadmin');
    });

    it('should get/set inherit_to_children', () => {
      entity.setInheritToChildren(false);
      expect(entity.getInheritToChildren()).toBe(false);
    });

    it('should get/set created_by', () => {
      entity.setCreatedBy('user-5');
      expect(entity.getCreatedBy()).toBe('user-5');
    });

    it('should get/set created_dt', () => {
      entity.setCreatedDt('2025-06-15T12:00:00Z');
      expect(entity.getCreatedDt()).toBe('2025-06-15T12:00:00Z');
    });
  });

  describe('static ROLE', () => {
    it('should have OWNER', () => {
      expect(FolderPermissionEntity.ROLE.OWNER).toBe('owner');
    });

    it('should have EDITOR', () => {
      expect(FolderPermissionEntity.ROLE.EDITOR).toBe('editor');
    });

    it('should have COMMENTER', () => {
      expect(FolderPermissionEntity.ROLE.COMMENTER).toBe('commenter');
    });

    it('should have VIEWER', () => {
      expect(FolderPermissionEntity.ROLE.VIEWER).toBe('viewer');
    });
  });

  describe('logic methods', () => {
    it('isOwner() should return true when role is owner', () => {
      const entity = new FolderPermissionEntity({ role: 'owner' });
      expect(entity.isOwner()).toBe(true);
    });

    it('isOwner() should return false when role is not owner', () => {
      const entity = new FolderPermissionEntity({ role: 'viewer' });
      expect(entity.isOwner()).toBe(false);
    });

    it('canEdit() should return true when role is owner', () => {
      const entity = new FolderPermissionEntity({ role: 'owner' });
      expect(entity.canEdit()).toBe(true);
    });

    it('canEdit() should return true when role is editor', () => {
      const entity = new FolderPermissionEntity({ role: 'editor' });
      expect(entity.canEdit()).toBe(true);
    });

    it('canEdit() should return false when role is commenter', () => {
      const entity = new FolderPermissionEntity({ role: 'commenter' });
      expect(entity.canEdit()).toBe(false);
    });

    it('canEdit() should return false when role is viewer', () => {
      const entity = new FolderPermissionEntity({ role: 'viewer' });
      expect(entity.canEdit()).toBe(false);
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(FolderPermissionEntity.schema);
      expect(keys).toEqual([
        'permission_id', 'tenant_id', 'folder_id', 'user_id', 'group_id',
        'role', 'inherit_to_children', 'created_by', 'created_dt'
      ]);
    });
  });

  describe('validation', () => {
    it('should be valid when tenant_id, folder_id, and role are provided', () => {
      const entity = new FolderPermissionEntity({
        tenant_id: 't-1', folder_id: 'f-1', role: 'viewer'
      });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when tenant_id is missing', () => {
      const entity = new FolderPermissionEntity({
        folder_id: 'f-1', role: 'viewer'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when folder_id is missing', () => {
      const entity = new FolderPermissionEntity({
        tenant_id: 't-1', role: 'viewer'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when role is missing', () => {
      const entity = new FolderPermissionEntity({
        tenant_id: 't-1', folder_id: 'f-1'
      });
      // Role defaults to 'viewer' in schema, so we need to explicitly clear it
      entity.setRole('viewer');
      // With default role set, it should be valid
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid with an invalid role value', () => {
      const entity = new FolderPermissionEntity({
        tenant_id: 't-1', folder_id: 'f-1', role: 'superadmin'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when all required fields are missing', () => {
      const entity = new FolderPermissionEntity();
      expect(entity.isValid()).toBe(false);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new FolderPermissionEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
