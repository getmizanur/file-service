const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FilePermissionEntity;
beforeAll(() => {
  FilePermissionEntity = require(globalThis.applicationPath('/application/entity/file-permission-entity'));
});

describe('FilePermissionEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new FilePermissionEntity();
      expect(entity.getPermissionId()).toBeNull();
      expect(entity.getTenantId()).toBeNull();
      expect(entity.getFileId()).toBeNull();
      expect(entity.getUserId()).toBeNull();
      expect(entity.getGroupId()).toBeNull();
      expect(entity.getRole()).toBe('viewer');
      expect(entity.getCreatedBy()).toBeNull();
      expect(entity.getCreatedDt()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        permission_id: 'perm-1',
        tenant_id: 'tenant-1',
        file_id: 'file-1',
        user_id: 'user-1',
        group_id: 'group-1',
        role: 'editor',
        created_by: 'admin-1',
        created_dt: '2025-01-01T00:00:00Z'
      };
      const entity = new FilePermissionEntity(data);
      expect(entity.getPermissionId()).toBe('perm-1');
      expect(entity.getTenantId()).toBe('tenant-1');
      expect(entity.getFileId()).toBe('file-1');
      expect(entity.getUserId()).toBe('user-1');
      expect(entity.getGroupId()).toBe('group-1');
      expect(entity.getRole()).toBe('editor');
      expect(entity.getCreatedBy()).toBe('admin-1');
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new FilePermissionEntity();
    });

    it('should get/set permission_id', () => {
      entity.setPermissionId('p-100');
      expect(entity.getPermissionId()).toBe('p-100');
    });

    it('should get/set tenant_id', () => {
      entity.setTenantId('t-200');
      expect(entity.getTenantId()).toBe('t-200');
    });

    it('should get/set file_id', () => {
      entity.setFileId('f-300');
      expect(entity.getFileId()).toBe('f-300');
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
      expect(FilePermissionEntity.ROLE.OWNER).toBe('owner');
    });

    it('should have EDITOR', () => {
      expect(FilePermissionEntity.ROLE.EDITOR).toBe('editor');
    });

    it('should have COMMENTER', () => {
      expect(FilePermissionEntity.ROLE.COMMENTER).toBe('commenter');
    });

    it('should have VIEWER', () => {
      expect(FilePermissionEntity.ROLE.VIEWER).toBe('viewer');
    });
  });

  describe('logic methods', () => {
    it('isOwner() should return true when role is owner', () => {
      const entity = new FilePermissionEntity({ role: 'owner' });
      expect(entity.isOwner()).toBe(true);
    });

    it('isOwner() should return false when role is not owner', () => {
      const entity = new FilePermissionEntity({ role: 'viewer' });
      expect(entity.isOwner()).toBe(false);
    });

    it('canEdit() should return true when role is owner', () => {
      const entity = new FilePermissionEntity({ role: 'owner' });
      expect(entity.canEdit()).toBe(true);
    });

    it('canEdit() should return true when role is editor', () => {
      const entity = new FilePermissionEntity({ role: 'editor' });
      expect(entity.canEdit()).toBe(true);
    });

    it('canEdit() should return false when role is commenter', () => {
      const entity = new FilePermissionEntity({ role: 'commenter' });
      expect(entity.canEdit()).toBe(false);
    });

    it('canEdit() should return false when role is viewer', () => {
      const entity = new FilePermissionEntity({ role: 'viewer' });
      expect(entity.canEdit()).toBe(false);
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(FilePermissionEntity.schema);
      expect(keys).toEqual([
        'permission_id', 'tenant_id', 'file_id', 'user_id', 'group_id',
        'role', 'created_by', 'created_dt'
      ]);
    });
  });

  describe('validation', () => {
    it('should be valid when tenant_id, file_id, and role are provided', () => {
      const entity = new FilePermissionEntity({
        tenant_id: 't-1', file_id: 'f-1', role: 'viewer'
      });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when tenant_id is missing', () => {
      const entity = new FilePermissionEntity({
        file_id: 'f-1', role: 'viewer'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when file_id is missing', () => {
      const entity = new FilePermissionEntity({
        tenant_id: 't-1', role: 'viewer'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid with an invalid role value', () => {
      const entity = new FilePermissionEntity({
        tenant_id: 't-1', file_id: 'f-1', role: 'superadmin'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when all required fields are missing', () => {
      const entity = new FilePermissionEntity();
      expect(entity.isValid()).toBe(false);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new FilePermissionEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
