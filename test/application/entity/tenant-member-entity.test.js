const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let TenantMemberEntity;
beforeAll(() => {
  TenantMemberEntity = require(globalThis.applicationPath('/application/entity/tenant-member-entity'));
});

describe('TenantMemberEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new TenantMemberEntity();
      expect(entity.getTenantId()).toBeNull();
      expect(entity.getUserId()).toBeNull();
      expect(entity.getRole()).toBe('member');
      expect(entity.getCreatedDt()).toBeNull();
      expect(entity.getStatus()).toBe('active');
    });

    it('should create an entity with data', () => {
      const data = {
        tenant_id: 't-1',
        user_id: 'u-1',
        role: 'admin',
        created_dt: '2025-01-01T00:00:00Z',
        status: 'active'
      };
      const entity = new TenantMemberEntity(data);
      expect(entity.getTenantId()).toBe('t-1');
      expect(entity.getUserId()).toBe('u-1');
      expect(entity.getRole()).toBe('admin');
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
      expect(entity.getStatus()).toBe('active');
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new TenantMemberEntity();
    });

    it('should get/set tenant_id', () => {
      entity.setTenantId('t-100');
      expect(entity.getTenantId()).toBe('t-100');
    });

    it('should get/set user_id', () => {
      entity.setUserId('u-200');
      expect(entity.getUserId()).toBe('u-200');
    });

    it('should get/set role with valid value', () => {
      entity.setRole('owner');
      expect(entity.getRole()).toBe('owner');
    });

    it('should get/set created_dt', () => {
      entity.setCreatedDt('2025-03-01T00:00:00Z');
      expect(entity.getCreatedDt()).toBe('2025-03-01T00:00:00Z');
    });

    it('should get/set status', () => {
      entity.setStatus('inactive');
      expect(entity.getStatus()).toBe('inactive');
    });
  });

  describe('setRole validation', () => {
    it('should throw on invalid role', () => {
      const entity = new TenantMemberEntity();
      expect(() => entity.setRole('superadmin')).toThrow('Invalid role: superadmin');
    });

    it('should accept all valid roles', () => {
      const entity = new TenantMemberEntity();
      Object.values(TenantMemberEntity.ROLE).forEach(role => {
        expect(() => entity.setRole(role)).not.toThrow();
      });
    });
  });

  describe('static ROLE', () => {
    it('should have all expected role values', () => {
      expect(TenantMemberEntity.ROLE).toEqual({
        OWNER: 'owner',
        ADMIN: 'admin',
        MEMBER: 'member',
        VIEWER: 'viewer'
      });
    });
  });

  describe('logic methods', () => {
    it('isAdmin() should return true for owner role', () => {
      const entity = new TenantMemberEntity({ role: 'owner' });
      expect(entity.isAdmin()).toBe(true);
    });

    it('isAdmin() should return true for admin role', () => {
      const entity = new TenantMemberEntity({ role: 'admin' });
      expect(entity.isAdmin()).toBe(true);
    });

    it('isAdmin() should return false for member role', () => {
      const entity = new TenantMemberEntity({ role: 'member' });
      expect(entity.isAdmin()).toBe(false);
    });

    it('isAdmin() should return false for viewer role', () => {
      const entity = new TenantMemberEntity({ role: 'viewer' });
      expect(entity.isAdmin()).toBe(false);
    });

    it('isOwner() should return true for owner role', () => {
      const entity = new TenantMemberEntity({ role: 'owner' });
      expect(entity.isOwner()).toBe(true);
    });

    it('isOwner() should return false for admin role', () => {
      const entity = new TenantMemberEntity({ role: 'admin' });
      expect(entity.isOwner()).toBe(false);
    });

    it('isOwner() should return false for member role', () => {
      const entity = new TenantMemberEntity({ role: 'member' });
      expect(entity.isOwner()).toBe(false);
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(TenantMemberEntity.schema);
      expect(keys).toEqual(['tenant_id', 'user_id', 'role', 'created_dt', 'status']);
    });

    it('should have correct default values', () => {
      expect(TenantMemberEntity.schema.tenant_id).toBeNull();
      expect(TenantMemberEntity.schema.user_id).toBeNull();
      expect(TenantMemberEntity.schema.role).toBe('member');
      expect(TenantMemberEntity.schema.created_dt).toBeNull();
      expect(TenantMemberEntity.schema.status).toBe('active');
    });
  });

  describe('validation', () => {
    it('should be valid when tenant_id, user_id, and role are provided', () => {
      const entity = new TenantMemberEntity({
        tenant_id: 't-1',
        user_id: 'u-1',
        role: 'member'
      });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when tenant_id is missing', () => {
      const entity = new TenantMemberEntity({ user_id: 'u-1', role: 'member' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when user_id is missing', () => {
      const entity = new TenantMemberEntity({ tenant_id: 't-1', role: 'member' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when role is not in allowed list', () => {
      const entity = new TenantMemberEntity({
        tenant_id: 't-1',
        user_id: 'u-1',
        role: 'superadmin'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when all required fields are missing', () => {
      const entity = new TenantMemberEntity();
      expect(entity.isValid()).toBe(false);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new TenantMemberEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
